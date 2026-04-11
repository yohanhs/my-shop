import { ipcMain } from 'electron';
import { assertAuthenticated, assertSuperAdmin } from '../auth/sessionStore';
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

const ROLES_FIJOS_MSG =
  'Los roles del sistema son fijos (SuperAdmin, Cajero). No se pueden crear ni editar desde la aplicación.';

export function registerRolIpc(): void {
  const prisma = getPrismaClient();

  for (const ch of ROL_CHANNELS) {
    ipcMain.removeHandler(ch);
  }

  ipcMain.handle('rol:listPaged', async (_event, opts: RolListPagedOpts) => {
    assertSuperAdmin();
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
    assertSuperAdmin();
    const allowed = new Set(['SuperAdmin', 'Cajero']);
    const rows = await prisma.rol.findMany({ orderBy: { nombre: 'asc' } });
    return rows.filter((r) => allowed.has(r.nombre));
  });

  ipcMain.handle('rol:getById', async (_event, id: number) => {
    assertSuperAdmin();
    return prisma.rol.findUnique({ where: { id } });
  });

  ipcMain.handle('rol:create', async () => {
    assertAuthenticated();
    throw new Error(ROLES_FIJOS_MSG);
  });

  ipcMain.handle('rol:update', async () => {
    assertAuthenticated();
    throw new Error(ROLES_FIJOS_MSG);
  });

  ipcMain.handle('rol:delete', async () => {
    assertAuthenticated();
    throw new Error(ROLES_FIJOS_MSG);
  });
}
