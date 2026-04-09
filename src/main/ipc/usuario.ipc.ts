import { ipcMain } from 'electron';
import bcrypt from 'bcryptjs';
import { getPrismaClient } from '../db/client';
import { buildUsuarioWhere, type UsuarioListPagedOpts } from './usuarioListWhere';

const USUARIO_CHANNELS = [
  'usuario:listPaged',
  'usuario:getById',
  'usuario:create',
  'usuario:update',
  'usuario:delete',
] as const;

async function hashPassword(plain: string): Promise<string> {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(plain, salt);
}

export function registerUsuarioIpc(): void {
  const prisma = getPrismaClient();

  for (const ch of USUARIO_CHANNELS) {
    ipcMain.removeHandler(ch);
  }

  ipcMain.handle('usuario:listPaged', async (_event, opts: UsuarioListPagedOpts) => {
    const page = Math.max(1, Math.floor(Number(opts?.page) || 1));
    const rawSize = Math.floor(Number(opts?.pageSize) || 10);
    const pageSize = Math.min(100, Math.max(1, rawSize));
    const skip = (page - 1) * pageSize;
    const where = buildUsuarioWhere(opts);

    const [rows, total] = await Promise.all([
      prisma.usuario.findMany({
        where,
        orderBy: { nombre: 'asc' },
        skip,
        take: pageSize,
        include: { rol: true },
      }),
      prisma.usuario.count({ where }),
    ]);

    const items = rows.map((u) => ({
      id: u.id,
      nombre: u.nombre,
      username: u.username,
      status: u.status,
      rolId: u.rolId,
      rolNombre: u.rol.nombre,
      createdAt: u.createdAt.toISOString(),
      updatedAt: u.updatedAt.toISOString(),
    }));

    return { items, total, page, pageSize };
  });

  ipcMain.handle('usuario:getById', async (_event, id: number) => {
    const u = await prisma.usuario.findUnique({
      where: { id },
      include: { rol: true },
    });
    if (!u) return null;
    return {
      id: u.id,
      nombre: u.nombre,
      username: u.username,
      status: u.status,
      rolId: u.rolId,
      rolNombre: u.rol.nombre,
      createdAt: u.createdAt.toISOString(),
      updatedAt: u.updatedAt.toISOString(),
    };
  });

  ipcMain.handle(
    'usuario:create',
    async (
      _event,
      data: {
        nombre: string;
        username: string;
        password: string;
        rolId: number;
        status?: string;
      },
    ) => {
      const passwordHash = await hashPassword(data.password);
      const u = await prisma.usuario.create({
        data: {
          nombre: data.nombre.trim(),
          username: data.username.trim(),
          passwordHash,
          rolId: data.rolId,
          status: data.status === 'INACTIVE' ? 'INACTIVE' : 'ACTIVE',
        },
        include: { rol: true },
      });
      return {
        id: u.id,
        nombre: u.nombre,
        username: u.username,
        status: u.status,
        rolId: u.rolId,
        rolNombre: u.rol.nombre,
        createdAt: u.createdAt.toISOString(),
        updatedAt: u.updatedAt.toISOString(),
      };
    },
  );

  ipcMain.handle(
    'usuario:update',
    async (
      _event,
      id: number,
      data: {
        nombre?: string;
        username?: string;
        password?: string;
        rolId?: number;
        status?: string;
      },
    ) => {
      const updatePayload: {
        nombre?: string;
        username?: string;
        passwordHash?: string;
        rolId?: number;
        status?: string;
      } = {};

      if (data.nombre !== undefined) updatePayload.nombre = data.nombre.trim();
      if (data.username !== undefined) updatePayload.username = data.username.trim();
      if (data.rolId !== undefined) updatePayload.rolId = data.rolId;
      if (data.status === 'ACTIVE' || data.status === 'INACTIVE') {
        updatePayload.status = data.status;
      }
      if (typeof data.password === 'string' && data.password.length > 0) {
        updatePayload.passwordHash = await hashPassword(data.password);
      }

      const u = await prisma.usuario.update({
        where: { id },
        data: updatePayload,
        include: { rol: true },
      });
      return {
        id: u.id,
        nombre: u.nombre,
        username: u.username,
        status: u.status,
        rolId: u.rolId,
        rolNombre: u.rol.nombre,
        createdAt: u.createdAt.toISOString(),
        updatedAt: u.updatedAt.toISOString(),
      };
    },
  );

  ipcMain.handle('usuario:delete', async (_event, id: number) => {
    const movCount = await prisma.movimientoStock.count({ where: { usuarioId: id } });
    if (movCount > 0) {
      throw new Error(
        `No se puede eliminar el usuario: tiene ${movCount} movimiento(s) de stock asociado(s).`,
      );
    }
    await prisma.usuario.delete({ where: { id } });
    return { ok: true };
  });
}
