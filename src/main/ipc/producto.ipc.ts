import type { Prisma } from '../db/generated/client';
import { ipcMain } from 'electron';
import { assertAuthenticated, assertNotCajero } from '../auth/sessionStore';
import { getPrismaClient } from '../db/client';
import { buildProductoWhere, type ListPagedOpts } from './productoListWhere';

const PRODUCTO_CHANNELS = [
  'producto:listPaged',
  'producto:getById',
  'producto:create',
  'producto:update',
  'producto:delete',
] as const;

function parseFechaCaducidad(raw: unknown): Date | null {
  if (raw == null) return null;
  if (typeof raw === 'string' && raw.trim() === '') return null;
  const s = String(raw).trim();
  const d = new Date(s.length <= 10 ? `${s}T12:00:00` : s);
  if (Number.isNaN(d.getTime())) {
    throw new Error('La fecha de caducidad no es válida.');
  }
  return d;
}

export function registerProductoIpc(): void {
  const prisma = getPrismaClient();

  for (const ch of PRODUCTO_CHANNELS) {
    ipcMain.removeHandler(ch);
  }

  ipcMain.handle('producto:listPaged', async (_event, opts: ListPagedOpts) => {
    assertAuthenticated();
    const page = Math.max(1, Math.floor(Number(opts?.page) || 1));
    const rawSize = Math.floor(Number(opts?.pageSize) || 10);
    const pageSize = Math.min(100, Math.max(1, rawSize));
    const skip = (page - 1) * pageSize;
    const where = buildProductoWhere(opts);

    const [items, total] = await Promise.all([
      prisma.producto.findMany({
        where,
        orderBy: { nombre: 'asc' },
        skip,
        take: pageSize,
      }),
      prisma.producto.count({ where }),
    ]);

    return { items, total, page, pageSize };
  });

  ipcMain.handle('producto:getById', async (_event, id: number) => {
    assertAuthenticated();
    return prisma.producto.findUnique({ where: { id } });
  });

  ipcMain.handle(
    'producto:create',
    async (
      _event,
      data: {
        nombre: string;
        sku: string;
        descripcion?: string | null;
        precioCosto: number;
        precioVenta: number;
        stockActual?: number;
        stockMinimo?: number;
        imagenPath?: string;
        fechaCaducidad?: string | null;
      },
    ) => {
      assertNotCajero();
      const fechaCaducidad = parseFechaCaducidad(data.fechaCaducidad);
      return prisma.producto.create({
        data: {
          nombre: data.nombre.trim(),
          sku: data.sku.trim(),
          descripcion: data.descripcion ?? null,
          precioCosto: data.precioCosto,
          precioVenta: data.precioVenta,
          stockActual: data.stockActual ?? 0,
          stockMinimo: data.stockMinimo ?? 0,
          imagenPath: data.imagenPath?.trim() || null,
          fechaCaducidad,
        },
      });
    },
  );

  ipcMain.handle(
    'producto:update',
    async (
      _event,
      id: number,
      data: {
        nombre?: string;
        sku?: string;
        descripcion?: string | null;
        precioCosto?: number;
        precioVenta?: number;
        stockActual?: number;
        stockMinimo?: number;
        imagenPath?: string;
        fechaCaducidad?: string | null;
        status?: string;
      },
    ) => {
      assertNotCajero();
      const payload: Prisma.ProductoUpdateInput = {};
      if (data.nombre !== undefined) payload.nombre = data.nombre.trim();
      if (data.sku !== undefined) payload.sku = data.sku.trim();
      if (data.descripcion !== undefined) payload.descripcion = data.descripcion;
      if (data.precioCosto !== undefined) payload.precioCosto = data.precioCosto;
      if (data.precioVenta !== undefined) payload.precioVenta = data.precioVenta;
      if (data.stockActual !== undefined) payload.stockActual = data.stockActual;
      if (data.stockMinimo !== undefined) payload.stockMinimo = data.stockMinimo;
      if (data.imagenPath !== undefined) payload.imagenPath = data.imagenPath?.trim() || null;
      if (data.fechaCaducidad !== undefined) {
        payload.fechaCaducidad = parseFechaCaducidad(data.fechaCaducidad);
      }
      if (data.status !== undefined) payload.status = data.status;

      return prisma.producto.update({ where: { id }, data: payload });
    },
  );

  ipcMain.handle('producto:delete', async (_event, id: number) => {
    assertNotCajero();
    return prisma.producto.delete({ where: { id } });
  });
}
