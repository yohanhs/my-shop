import { ipcMain } from 'electron';
import { assertNotCajero } from '../auth/sessionStore';
import { getPrismaClient } from '../db/client';
import { buildGastoWhere, type GastoListPagedOpts } from './gastoListWhere';

const GASTO_CHANNELS = [
  'gasto:listPaged',
  'gasto:getById',
  'gasto:create',
  'gasto:update',
  'gasto:delete',
] as const;

const DATE_YMD_RE = /^\d{4}-\d{2}-\d{2}$/;

function toGastoDto(g: {
  id: number;
  concepto: string;
  monto: number;
  fecha: Date;
  categoria: string;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: g.id,
    concepto: g.concepto,
    monto: g.monto,
    fecha: g.fecha.toISOString(),
    categoria: g.categoria,
    createdAt: g.createdAt.toISOString(),
    updatedAt: g.updatedAt.toISOString(),
  };
}

function parseFechaGasto(raw: unknown): Date {
  if (raw === undefined || raw === null || raw === '') {
    return new Date();
  }
  const s = String(raw).trim();
  if (DATE_YMD_RE.test(s)) {
    const [y, m, d] = s.split('-').map((x) => Number(x));
    return new Date(y, m - 1, d, 12, 0, 0, 0);
  }
  const t = new Date(s);
  if (Number.isNaN(t.getTime())) {
    return new Date();
  }
  return t;
}

function parseMonto(raw: unknown): number {
  const n = typeof raw === 'number' ? raw : Number.parseFloat(String(raw));
  if (!Number.isFinite(n) || n <= 0) {
    throw new Error('El monto debe ser un número mayor que cero.');
  }
  return Math.round(n * 100) / 100;
}

export function registerGastoIpc(): void {
  const prisma = getPrismaClient();

  for (const ch of GASTO_CHANNELS) {
    ipcMain.removeHandler(ch);
  }

  ipcMain.handle('gasto:listPaged', async (_event, opts: GastoListPagedOpts) => {
    assertNotCajero();
    const page = Math.max(1, Math.floor(Number(opts?.page) || 1));
    const rawSize = Math.floor(Number(opts?.pageSize) || 10);
    const pageSize = Math.min(100, Math.max(1, rawSize));
    const skip = (page - 1) * pageSize;
    const where = buildGastoWhere(opts);

    const [rows, total] = await Promise.all([
      prisma.gasto.findMany({
        where,
        orderBy: [{ fecha: 'desc' }, { id: 'desc' }],
        skip,
        take: pageSize,
      }),
      prisma.gasto.count({ where }),
    ]);

    const items = rows.map(toGastoDto);
    return { items, total, page, pageSize };
  });

  ipcMain.handle('gasto:getById', async (_event, id: number) => {
    assertNotCajero();
    const g = await prisma.gasto.findUnique({ where: { id } });
    return g ? toGastoDto(g) : null;
  });

  ipcMain.handle(
    'gasto:create',
    async (
      _event,
      data: {
        concepto: string;
        monto: number;
        fecha?: string | null;
        categoria: string;
      },
    ) => {
      assertNotCajero();
      const concepto = typeof data.concepto === 'string' ? data.concepto.trim() : '';
      if (concepto.length === 0) {
        throw new Error('El concepto es obligatorio.');
      }
      const categoria = typeof data.categoria === 'string' ? data.categoria.trim() : '';
      if (categoria.length === 0) {
        throw new Error('La categoría es obligatoria.');
      }
      const monto = parseMonto(data.monto);
      const fecha = parseFechaGasto(data.fecha);

      const g = await prisma.gasto.create({
        data: {
          concepto,
          monto,
          fecha,
          categoria,
        },
      });
      return toGastoDto(g);
    },
  );

  ipcMain.handle(
    'gasto:update',
    async (
      _event,
      id: number,
      data: {
        concepto?: string;
        monto?: number;
        fecha?: string | null;
        categoria?: string;
      },
    ) => {
      assertNotCajero();
      const payload: {
        concepto?: string;
        monto?: number;
        fecha?: Date;
        categoria?: string;
      } = {};

      if (data.concepto !== undefined) {
        const c = String(data.concepto).trim();
        if (c.length === 0) throw new Error('El concepto es obligatorio.');
        payload.concepto = c;
      }
      if (data.categoria !== undefined) {
        const cat = String(data.categoria).trim();
        if (cat.length === 0) throw new Error('La categoría es obligatoria.');
        payload.categoria = cat;
      }
      if (data.monto !== undefined) {
        payload.monto = parseMonto(data.monto);
      }
      if (data.fecha !== undefined) {
        payload.fecha = parseFechaGasto(data.fecha);
      }

      const g = await prisma.gasto.update({
        where: { id },
        data: payload,
      });
      return toGastoDto(g);
    },
  );

  ipcMain.handle('gasto:delete', async (_event, id: number) => {
    assertNotCajero();
    const g = await prisma.gasto.delete({ where: { id } });
    return toGastoDto(g);
  });
}
