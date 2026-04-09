import { ipcMain } from 'electron';
import { getPrismaClient } from '../db/client';
import { buildRolWhere, type RolListPagedOpts } from './rolListWhere';

const ROL_CHANNELS = [
  'rol:listPaged',
  'rol:listAll',
  'rol:getById',
  'rol:create',
  'rol:update',
  'rol:delete',
] as const;

export function registerRolIpc(): void {
  const prisma = getPrismaClient();

  for (const ch of ROL_CHANNELS) {
    ipcMain.removeHandler(ch);
  }

  ipcMain.handle('rol:listPaged', async (_event, opts: RolListPagedOpts) => {
    const page = Math.max(1, Math.floor(Number(opts?.page) || 1));
    const rawSize = Math.floor(Number(opts?.pageSize) || 10);
    const pageSize = Math.min(100, Math.max(1, rawSize));
    const skip = (page - 1) * pageSize;
    const where = buildRolWhere(opts);

    const [items, total] = await Promise.all([
      prisma.rol.findMany({
        where,
        orderBy: { nombre: 'asc' },
        skip,
        take: pageSize,
      }),
      prisma.rol.count({ where }),
    ]);

    return { items, total, page, pageSize };
  });

  ipcMain.handle('rol:listAll', async () => {
    return prisma.rol.findMany({ orderBy: { nombre: 'asc' } });
  });

  ipcMain.handle('rol:getById', async (_event, id: number) => {
    return prisma.rol.findUnique({ where: { id } });
  });

  ipcMain.handle('rol:create', async (_event, data: { nombre: string }) => {
    return prisma.rol.create({
      data: { nombre: data.nombre.trim() },
    });
  });

  ipcMain.handle('rol:update', async (_event, id: number, data: { nombre: string }) => {
    return prisma.rol.update({
      where: { id },
      data: { nombre: data.nombre.trim() },
    });
  });

  ipcMain.handle('rol:delete', async (_event, id: number) => {
    const count = await prisma.usuario.count({ where: { rolId: id } });
    if (count > 0) {
      throw new Error(
        `No se puede eliminar el rol: hay ${count} usuario(s) asignado(s). Reasígnalos antes.`,
      );
    }
    return prisma.rol.delete({ where: { id } });
  });
}
