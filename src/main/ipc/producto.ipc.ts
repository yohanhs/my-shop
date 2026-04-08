import { ipcMain } from 'electron';
import { getPrismaClient } from '../db/client';

export function registerProductoIpc(): void {
  const prisma = getPrismaClient();

  ipcMain.handle('producto:getAll', async () => {
    return prisma.producto.findMany({
      orderBy: { nombre: 'asc' },
    });
  });

  ipcMain.handle('producto:getById', async (_event, id: number) => {
    return prisma.producto.findUnique({ where: { id } });
  });

  ipcMain.handle('producto:create', async (_event, data: {
    nombre: string;
    sku: string;
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
