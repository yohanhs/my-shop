import { BrowserWindow, dialog, ipcMain, type OpenDialogOptions, type SaveDialogOptions } from 'electron';
import path from 'path';

import { assertNotCajero, assertSuperAdmin, setAuthSession } from '../auth/sessionStore';
import { copyCurrentDatabaseTo, getDbPath, getPrismaClient, importDatabaseFromFile } from '../db/client';
import { seedDefaultAuth } from './auth.ipc';

const CHANNELS = ['database:getDbPath', 'database:backup', 'database:restore', 'database:wipeAllData'] as const;

async function wipeAllApplicationData(): Promise<void> {
  const prisma = getPrismaClient();
  await prisma.$transaction(
    async (tx) => {
      await tx.ventaDetalle.deleteMany();
      await tx.venta.deleteMany();
      await tx.gasto.deleteMany();
      await tx.movimientoStock.deleteMany();
      await tx.producto.deleteMany();
      await tx.proveedor.deleteMany();
      await tx.usuario.deleteMany();
      await tx.configuracion.deleteMany();
      await tx.rol.deleteMany();
    },
    { timeout: 120_000 },
  );
  await seedDefaultAuth(prisma);
  await prisma.configuracion.create({
    data: {
      nombreTienda: 'Mi Tienda',
      moneda: 'MXN',
      impuestoPorcentaje: 16,
      depreciacionMensual: 0,
      logoPath: null,
      imagenesDirDefault: null,
      fondoAppPath: null,
    },
  });
}

function parentWindowFromEvent(sender: Electron.WebContents): BrowserWindow | null {
  return BrowserWindow.fromWebContents(sender);
}

function backupDefaultFileName(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const h = String(d.getHours()).padStart(2, '0');
  const min = String(d.getMinutes()).padStart(2, '0');
  return `my-shop-respaldo-${y}${m}${day}-${h}${min}.db`;
}

export function registerDatabaseIpc(): void {
  for (const ch of CHANNELS) {
    ipcMain.removeHandler(ch);
  }

  ipcMain.handle('database:getDbPath', async () => {
    assertNotCajero();
    return { path: getDbPath() };
  });

  ipcMain.handle('database:backup', async (event) => {
    assertNotCajero();
    const win = parentWindowFromEvent(event.sender);
    const saveOpts: SaveDialogOptions = {
      title: 'Guardar copia de la base de datos',
      defaultPath: backupDefaultFileName(),
      filters: [{ name: 'SQLite', extensions: ['db'] }],
    };
    const r = win ? await dialog.showSaveDialog(win, saveOpts) : await dialog.showSaveDialog(saveOpts);
    if (r.canceled || !r.filePath) {
      return { canceled: true as const };
    }
    const outPath = await copyCurrentDatabaseTo(r.filePath);
    return { canceled: false as const, path: outPath };
  });

  ipcMain.handle('database:restore', async (event) => {
    assertNotCajero();
    const win = parentWindowFromEvent(event.sender);

    const restoreConfirmOpts = {
      type: 'warning' as const,
      buttons: ['Cancelar', 'Sí, reemplazar base de datos'],
      defaultId: 0,
      cancelId: 0,
      title: 'Importar base de datos',
      message: 'Se reemplazará la base de datos actual por el archivo que elijas.',
      detail:
        'Se guardará una copia automática de la base actual en la carpeta de datos de la app antes de importar. Tras importar deberás iniciar sesión de nuevo. Esta acción no se puede deshacer desde la aplicación.',
    };
    const confirm = win
      ? await dialog.showMessageBox(win, restoreConfirmOpts)
      : await dialog.showMessageBox(restoreConfirmOpts);
    if (confirm.response !== 1) {
      return { canceled: true as const };
    }

    const openOpts: OpenDialogOptions = {
      title: 'Elegir archivo .db de respaldo',
      properties: ['openFile'],
      filters: [{ name: 'SQLite', extensions: ['db'] }],
    };
    const openR = win ? await dialog.showOpenDialog(win, openOpts) : await dialog.showOpenDialog(openOpts);
    if (openR.canceled || openR.filePaths.length === 0) {
      return { canceled: true as const };
    }
    const picked = openR.filePaths[0];
    const current = getDbPath();
    if (path.resolve(picked) === path.resolve(current)) {
      throw new Error('Elige un archivo distinto al de la base de datos en uso.');
    }

    const dataDir = path.dirname(current);
    const autoBackupPath = path.join(dataDir, `my-shop-auto-antes-importar-${Date.now()}.db`);
    await copyCurrentDatabaseTo(autoBackupPath);

    await importDatabaseFromFile(picked);
    setAuthSession(null);

    return { canceled: false as const, ok: true as const, autoBackupPath };
  });

  ipcMain.handle('database:wipeAllData', async () => {
    assertSuperAdmin();
    await wipeAllApplicationData();
    setAuthSession(null);
    return { ok: true as const };
  });
}
