import { ipcMain } from 'electron';
import { assertAuthenticated, assertNotCajero } from '../auth/sessionStore';
import { getPrismaClient } from '../db/client';

const CHANNELS = ['configuracion:get', 'configuracion:getPublicAmbient', 'configuracion:update'] as const;

function toDto(row: {
  id: number;
  nombreTienda: string;
  moneda: string;
  impuestoPorcentaje: number;
  logoPath: string | null;
  imagenesDirDefault: string | null;
  fondoAppPath: string | null;
  depreciacionMensual: number;
}) {
  return {
    id: row.id,
    nombreTienda: row.nombreTienda,
    moneda: row.moneda,
    impuestoPorcentaje: row.impuestoPorcentaje,
    logoPath: row.logoPath,
    imagenesDirDefault: row.imagenesDirDefault,
    fondoAppPath: row.fondoAppPath,
    depreciacionMensual: row.depreciacionMensual,
  };
}

function normLogo(v: unknown): string | null | undefined {
  if (v === undefined) return undefined;
  if (v === null) return null;
  if (typeof v !== 'string') return undefined;
  const t = v.trim();
  return t.length === 0 ? null : t;
}

function normImagenesDir(v: unknown): string | null | undefined {
  return normLogo(v);
}

export function registerConfiguracionIpc(): void {
  const prisma = getPrismaClient();

  for (const ch of CHANNELS) {
    ipcMain.removeHandler(ch);
  }

  ipcMain.handle('configuracion:get', async () => {
    assertAuthenticated();
    let row = await prisma.configuracion.findFirst({ orderBy: { id: 'asc' } });
    if (!row) {
      row = await prisma.configuracion.create({
        data: {
          nombreTienda: 'Mi Tienda',
          moneda: 'MXN',
          impuestoPorcentaje: 16,
        },
      });
    }
    return toDto(row);
  });

  /** Solo ruta de fondo: lectura sin sesión (pantalla de login y capa visual). */
  ipcMain.handle('configuracion:getPublicAmbient', async () => {
    const row = await prisma.configuracion.findFirst({
      orderBy: { id: 'asc' },
      select: { fondoAppPath: true },
    });
    return { fondoAppPath: row?.fondoAppPath ?? null };
  });

  ipcMain.handle(
    'configuracion:update',
    async (
      _event,
      id: number,
      data: {
        nombreTienda?: string;
        moneda?: string;
        impuestoPorcentaje?: number;
        logoPath?: string | null;
        imagenesDirDefault?: string | null;
        fondoAppPath?: string | null;
        depreciacionMensual?: number;
      },
    ) => {
      assertNotCajero();
      const payload: {
        nombreTienda?: string;
        moneda?: string;
        impuestoPorcentaje?: number;
        logoPath?: string | null;
        imagenesDirDefault?: string | null;
        fondoAppPath?: string | null;
        depreciacionMensual?: number;
      } = {};
      if (data.nombreTienda !== undefined) payload.nombreTienda = data.nombreTienda.trim();
      if (data.moneda !== undefined) payload.moneda = data.moneda.trim().toUpperCase();
      if (data.impuestoPorcentaje !== undefined) {
        payload.impuestoPorcentaje = data.impuestoPorcentaje;
      }
      if (data.logoPath !== undefined) {
        payload.logoPath = normLogo(data.logoPath) ?? null;
      }
      if (data.imagenesDirDefault !== undefined) {
        payload.imagenesDirDefault = normImagenesDir(data.imagenesDirDefault) ?? null;
      }
      if (data.fondoAppPath !== undefined) {
        payload.fondoAppPath = normLogo(data.fondoAppPath) ?? null;
      }
      if (data.depreciacionMensual !== undefined) {
        const n = Number(data.depreciacionMensual);
        payload.depreciacionMensual = Number.isFinite(n) && n >= 0 ? n : 0;
      }

      const row = await prisma.configuracion.update({
        where: { id },
        data: payload,
      });
      return toDto(row);
    },
  );
}
