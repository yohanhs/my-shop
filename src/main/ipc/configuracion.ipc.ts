import { ipcMain } from 'electron';
import { getPrismaClient } from '../db/client';

const CHANNELS = ['configuracion:get', 'configuracion:update'] as const;

function toDto(row: {
  id: number;
  nombreTienda: string;
  moneda: string;
  impuestoPorcentaje: number;
  logoPath: string | null;
}) {
  return {
    id: row.id,
    nombreTienda: row.nombreTienda,
    moneda: row.moneda,
    impuestoPorcentaje: row.impuestoPorcentaje,
    logoPath: row.logoPath,
  };
}

function normLogo(v: unknown): string | null | undefined {
  if (v === undefined) return undefined;
  if (v === null) return null;
  if (typeof v !== 'string') return undefined;
  const t = v.trim();
  return t.length === 0 ? null : t;
}

export function registerConfiguracionIpc(): void {
  const prisma = getPrismaClient();

  for (const ch of CHANNELS) {
    ipcMain.removeHandler(ch);
  }

  ipcMain.handle('configuracion:get', async () => {
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
      },
    ) => {
      const payload: {
        nombreTienda?: string;
        moneda?: string;
        impuestoPorcentaje?: number;
        logoPath?: string | null;
      } = {};
      if (data.nombreTienda !== undefined) payload.nombreTienda = data.nombreTienda.trim();
      if (data.moneda !== undefined) payload.moneda = data.moneda.trim().toUpperCase();
      if (data.impuestoPorcentaje !== undefined) {
        payload.impuestoPorcentaje = data.impuestoPorcentaje;
      }
      if (data.logoPath !== undefined) {
        payload.logoPath = normLogo(data.logoPath) ?? null;
      }

      const row = await prisma.configuracion.update({
        where: { id },
        data: payload,
      });
      return toDto(row);
    },
  );
}
