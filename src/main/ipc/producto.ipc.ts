import { ipcMain } from 'electron';
import { getPrismaClient } from '../db/client';
import { buildProductoWhere, type ListPagedOpts } from './productoListWhere';

const PRODUCTO_CHANNELS = [
  'producto:listPaged',
  'producto:getById',
  'producto:create',
  'producto:update',
  'producto:delete',
] as const;

export function registerProductoIpc(): void {
  const prisma = getPrismaClient();

  for (const ch of PRODUCTO_CHANNELS) {
    ipcMain.removeHandler(ch);
  }

  ipcMain.handle('producto:listPaged', async (_event, opts: ListPagedOpts) => {
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
    return prisma.producto.findUnique({ where: { id } });
  });

  ipcMain.handle('producto:create', async (_event, data: {
    nombre: string;
    sku: string;
    descripcion?: string | null;
    precioCosto: number;
    precioVenta: number;
    stockActual?: number;
    stockMinimo?: number;
    imagenPath?: string;
  }) => {
    return prisma.producto.create({ data });
  });

  ipcMain.handle('producto:update', async (_event, id: number, data: {
    nombre?: string;
    sku?: string;
    descripcion?: string | null;
    precioCosto?: number;
    precioVenta?: number;
    stockActual?: number;
    stockMinimo?: number;
    imagenPath?: string;
    status?: string;
  }) => {
    return prisma.producto.update({
      where: { id },
      data,
    });
  });

  ipcMain.handle('producto:delete', async (_event, id: number) => {
    return prisma.producto.delete({ where: { id } });
  });
}
