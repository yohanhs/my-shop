'use strict';

/**
 * Módulo 2 — Validación de licencia (docs/licence.md).
 * - licencia.lic: JSON { data: { machineId, expiresAt }, signature } (firma Ed25519 sobre UTF-8(JSON.stringify(data))).
 * - Clave pública: src/assets/public.pem (desarrollo) o dist/assets/public.pem (build).
 */

const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { app, ipcMain, dialog, BrowserWindow } = require('electron');
const { machineIdSync } = require('node-machine-id');

const STORE_KEY_LAST_ACCESS = 'lastAccessDate';
/** Día local `YYYY-MM-DD` en que ya se mostró el recordatorio de caducidad (máx. una vez al día). */
const STORE_KEY_LICENSE_REMINDER_DAY = 'licenseReminderCalendarDay';

/** A partir de cuántos días restantes se avisa (una vez por día calendario). */
const LICENSE_WARN_MAX_DAYS = 7;
/** Revalidar licencia y recordatorios (ms). */
const LICENSE_MONITOR_MS = 15 * 60 * 1000;

let licenseMonitorTimer = null;
/** Evita reenviar `license:revoked` en cada tick con el mismo fallo. */
let lastRevokedSignature = null;

/** @type {import('electron-store').default | null} */
let storeInstance = null;

async function getLicenseStore() {
  if (storeInstance) return storeInstance;
  const { default: Store } = await import('electron-store');
  storeInstance = new Store({
    name: 'license-guard',
    defaults: {},
  });
  return storeInstance;
}

function shouldBypassLicense() {
  if (process.env.MY_SHOP_SKIP_LICENSE === '1') return true;
  /** Probar validación sin empaquetar (p. ej. tras `npm run build` + `MY_SHOP_FORCE_LICENSE=1 npm start`). */
  if (process.env.MY_SHOP_FORCE_LICENSE === '1') return false;
  if (!app.isPackaged) return true;
  return false;
}

function resolvePublicKeyPemPath() {
  const candidates = [
    path.join(__dirname, '..', 'assets', 'public.pem'),
    path.join(process.cwd(), 'src', 'assets', 'public.pem'),
  ];
  for (const p of candidates) {
    if (fs.existsSync(p)) return p;
  }
  return null;
}

function resolveLicenciaFilePaths() {
  /** Instalada desde la pantalla de activación (prioridad máxima) */
  const userDataLic = path.join(app.getPath('userData'), 'licencia.lic');
  /** Raíz del usuario (~) */
  const home = path.join(os.homedir(), 'licencia.lic');
  /** Carpeta de trabajo (p. ej. repo en desarrollo) */
  const cwd = path.join(process.cwd(), 'licencia.lic');
  /** Junto al ejecutable (empaquetado) */
  const nextToExe =
    app?.isPackaged === true ? path.join(path.dirname(app.getPath('exe')), 'licencia.lic') : null;

  const ordered = [userDataLic, home, cwd];
  if (nextToExe) ordered.push(nextToExe);
  return ordered;
}

function readLicenciaDocument(raw) {
  const trimmed = raw.trim();
  try {
    return JSON.parse(trimmed);
  } catch {
    try {
      const decoded = Buffer.from(trimmed, 'base64').toString('utf8');
      return JSON.parse(decoded);
    } catch {
      return null;
    }
  }
}

function canonicalDataBuffer(data) {
  return Buffer.from(JSON.stringify(data), 'utf8');
}

function localCalendarDayKey(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function broadcastLicenseRevoked(payload) {
  for (const win of BrowserWindow.getAllWindows()) {
    if (win.isDestroyed()) continue;
    try {
      win.webContents.send('license:revoked', payload);
    } catch {
      /* ignorar */
    }
  }
}

/** Un solo aviso por tick: ventana enfocada o la primera disponible. */
function broadcastLicenseWarn(payload) {
  const focused = BrowserWindow.getFocusedWindow();
  const target =
    focused && !focused.isDestroyed()
      ? focused
      : BrowserWindow.getAllWindows().find((w) => !w.isDestroyed());
  if (!target || target.isDestroyed()) return;
  try {
    target.webContents.send('license:warn', payload);
  } catch {
    /* ignorar */
  }
}

/**
 * @returns {Promise<
 *   | { valid: true; expiresAt?: string; daysRemaining?: number }
 *   | { valid: false; reason: string; code?: string }
 * >}
 */
async function verifyLicense() {
  if (shouldBypassLicense()) {
    return { valid: true };
  }

  const pemPath = resolvePublicKeyPemPath();
  if (!pemPath) {
    return {
      valid: false,
      code: 'KEY',
      reason: 'No se encontró la clave pública (public.pem) en assets de la aplicación.',
    };
  }

  let publicPem;
  try {
    publicPem = fs.readFileSync(pemPath, 'utf8');
  } catch (e) {
    return { valid: false, code: 'KEY', reason: `No se pudo leer public.pem: ${(e && e.message) || e}` };
  }

  const licPaths = resolveLicenciaFilePaths();
  let licRaw = null;
  for (const p of licPaths) {
    if (fs.existsSync(p)) {
      try {
        licRaw = fs.readFileSync(p, 'utf8');
        break;
      } catch {
        /* continuar */
      }
    }
  }

  if (!licRaw) {
    return {
      valid: false,
      code: 'FILE',
      reason: `No se encontró licencia.lic. Buscado en: ${licPaths.join(' · ')}`,
    };
  }

  const doc = readLicenciaDocument(licRaw);
  if (!doc || typeof doc !== 'object' || !doc.data || typeof doc.signature !== 'string') {
    return {
      valid: false,
      code: 'FILE',
      reason: 'licencia.lic no tiene el formato esperado (objeto con "data" y "signature").',
    };
  }

  const { data } = doc;
  if (typeof data.machineId !== 'string' || typeof data.expiresAt !== 'string') {
    return {
      valid: false,
      code: 'FILE',
      reason: 'data.machineId y data.expiresAt deben ser cadenas.',
    };
  }

  let sigBuf;
  try {
    sigBuf = Buffer.from(doc.signature, 'base64');
  } catch {
    return { valid: false, code: 'SIGNATURE', reason: 'La firma no es base64 válido.' };
  }

  const msg = canonicalDataBuffer(data);
  let okSig;
  try {
    okSig = crypto.verify(null, msg, publicPem, sigBuf);
  } catch (e) {
    return {
      valid: false,
      code: 'SIGNATURE',
      reason: `Error al verificar firma Ed25519: ${(e && e.message) || e}`,
    };
  }

  if (!okSig) {
    return {
      valid: false,
      code: 'SIGNATURE',
      reason: 'La firma no coincide con los datos (licencia alterada o clave pública distinta al generador).',
    };
  }

  let localId;
  try {
    localId = machineIdSync();
  } catch (e) {
    return {
      valid: false,
      code: 'MACHINE',
      reason: `No se pudo obtener el ID de máquina: ${(e && e.message) || e}`,
    };
  }

  if (data.machineId !== localId) {
    return {
      valid: false,
      code: 'MACHINE',
      reason: 'Esta licencia no corresponde a este equipo.',
    };
  }

  const expMs = new Date(data.expiresAt).getTime();
  if (Number.isNaN(expMs)) {
    return { valid: false, code: 'EXPIRED', reason: 'expiresAt no es una fecha válida.' };
  }
  if (Date.now() > expMs) {
    return {
      valid: false,
      code: 'EXPIRED',
      reason: `La suscripción finalizó el ${data.expiresAt}.`,
    };
  }

  const store = await getLicenseStore();
  const lastAccessRaw = store.get(STORE_KEY_LAST_ACCESS);
  if (lastAccessRaw) {
    const lastMs = new Date(String(lastAccessRaw)).getTime();
    if (!Number.isNaN(lastMs) && Date.now() < lastMs) {
      return {
        valid: false,
        code: 'CLOCK',
        reason:
          'Seguridad: la fecha del sistema es anterior al último acceso registrado. Corrige la hora del equipo o contacta soporte.',
      };
    }
  }

  store.set(STORE_KEY_LAST_ACCESS, new Date().toISOString());

  const daysRemaining = Math.max(0, Math.ceil((expMs - Date.now()) / 86400000));
  return { valid: true, expiresAt: data.expiresAt, daysRemaining };
}

/**
 * Vigilancia en empaquetado: caducidad / archivo inválido → `license:revoked`;
 * últimos 7 días → `license:warn` como máximo una vez por día calendario.
 */
async function licenseMonitorTick() {
  if (shouldBypassLicense()) return;

  const r = await verifyLicense();
  if (!r.valid) {
    const sig = `${r.code || ''}:${r.reason || ''}`;
    if (lastRevokedSignature !== sig) {
      lastRevokedSignature = sig;
      broadcastLicenseRevoked({
        reason: r.reason || 'Licencia no válida.',
        code: r.code,
      });
    }
    return;
  }

  lastRevokedSignature = null;

  const dr = r.daysRemaining;
  const store = await getLicenseStore();

  if (typeof dr === 'number' && dr > LICENSE_WARN_MAX_DAYS) {
    store.delete(STORE_KEY_LICENSE_REMINDER_DAY);
    return;
  }

  if (typeof dr === 'number' && dr > 0 && dr <= LICENSE_WARN_MAX_DAYS) {
    const today = localCalendarDayKey();
    const last = store.get(STORE_KEY_LICENSE_REMINDER_DAY);
    if (last !== today) {
      store.set(STORE_KEY_LICENSE_REMINDER_DAY, today);
      broadcastLicenseWarn({
        daysRemaining: dr,
        expiresAt: r.expiresAt || '',
      });
    }
  }
}

function startLicenseMonitoring() {
  if (licenseMonitorTimer != null) return;
  void licenseMonitorTick();
  /** Por si el primer tick ocurre antes de que el renderer suscriba `onLicenseWarning`. */
  setTimeout(() => {
    void licenseMonitorTick();
  }, 3000);
  licenseMonitorTimer = setInterval(() => {
    void licenseMonitorTick();
  }, LICENSE_MONITOR_MS);
}

function registerLicenseIpc() {
  ipcMain.removeHandler('check-license');
  ipcMain.removeHandler('license:selectAndInstall');
  ipcMain.removeHandler('license:getMachineId');

  ipcMain.handle('license:getMachineId', () => {
    try {
      return { ok: true, machineId: machineIdSync() };
    } catch (e) {
      return {
        ok: false,
        reason: (e && e.message) || String(e),
      };
    }
  });

  ipcMain.handle('check-license', async () => {
    try {
      return await verifyLicense();
    } catch (e) {
      return {
        valid: false,
        code: 'FILE',
        reason: (e && e.message) || String(e),
      };
    }
  });

  ipcMain.handle('license:selectAndInstall', async (event) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    const picked = await dialog.showOpenDialog(win ?? undefined, {
      title: 'Seleccionar archivo de licencia',
      properties: ['openFile'],
      filters: [
        { name: 'Licencia', extensions: ['lic'] },
        { name: 'Todos los archivos', extensions: ['*'] },
      ],
    });
    if (picked.canceled || !picked.filePaths?.length) {
      return { canceled: true };
    }
    const dest = path.join(app.getPath('userData'), 'licencia.lic');
    try {
      fs.copyFileSync(picked.filePaths[0], dest);
    } catch (e) {
      return {
        valid: false,
        code: 'FILE',
        reason: `No se pudo guardar la licencia: ${(e && e.message) || e}`,
      };
    }
    try {
      return await verifyLicense();
    } catch (e) {
      return {
        valid: false,
        code: 'FILE',
        reason: (e && e.message) || String(e),
      };
    }
  });
}

module.exports = {
  verifyLicense,
  registerLicenseIpc,
  startLicenseMonitoring,
};
