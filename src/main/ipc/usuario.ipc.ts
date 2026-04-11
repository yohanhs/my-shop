import { ipcMain } from 'electron';
import bcrypt from 'bcryptjs';
import { assertAuthenticated, assertSuperAdmin, getAuthSession, setAuthSession } from '../auth/sessionStore';
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

const ROLES_ASIGNABLES = ['SuperAdmin', 'Cajero'] as const;

async function assertRolIdAssignable(
  prisma: ReturnType<typeof getPrismaClient>,
  rolId: number,
): Promise<void> {
  const r = await prisma.rol.findUnique({ where: { id: rolId } });
  if (!r || !(ROLES_ASIGNABLES as readonly string[]).includes(r.nombre)) {
    throw new Error('Solo pueden asignarse los roles SuperAdmin o Cajero.');
  }
}

export function registerUsuarioIpc(): void {
  const prisma = getPrismaClient();

  for (const ch of USUARIO_CHANNELS) {
    ipcMain.removeHandler(ch);
  }

  ipcMain.handle('usuario:listPaged', async (_event, opts: UsuarioListPagedOpts) => {
    assertSuperAdmin();
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
    assertAuthenticated();
    const snap = getAuthSession();
    if (!snap) throw new Error('Sesión no válida.');
    const isElevated = snap.rolNombre === 'SuperAdmin';
    if (!isElevated && id !== snap.usuarioId) {
      throw new Error('No autorizado.');
    }

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
      assertSuperAdmin();
      await assertRolIdAssignable(prisma, data.rolId);
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
      assertAuthenticated();
      const snap = getAuthSession();
      if (!snap) throw new Error('Sesión no válida.');
      const isElevated = snap.rolNombre === 'SuperAdmin';
      if (!isElevated && id !== snap.usuarioId) {
        throw new Error('No autorizado.');
      }

      const updatePayload: {
        nombre?: string;
        username?: string;
        passwordHash?: string;
        rolId?: number;
        status?: string;
      } = {};

      if (data.nombre !== undefined) updatePayload.nombre = data.nombre.trim();
      if (data.username !== undefined) updatePayload.username = data.username.trim();
      if (isElevated) {
        if (data.rolId !== undefined) updatePayload.rolId = data.rolId;
        if (data.status === 'ACTIVE' || data.status === 'INACTIVE') {
          updatePayload.status = data.status;
        }
      }
      if (typeof data.password === 'string' && data.password.length > 0) {
        updatePayload.passwordHash = await hashPassword(data.password);
      }

      if (updatePayload.rolId !== undefined) {
        await assertRolIdAssignable(prisma, updatePayload.rolId);
      }

      const u = await prisma.usuario.update({
        where: { id },
        data: updatePayload,
        include: { rol: true },
      });
      if (snap.usuarioId === u.id) {
        setAuthSession({
          usuarioId: u.id,
          username: u.username,
          nombre: u.nombre,
          rolId: u.rolId,
          rolNombre: u.rol.nombre,
        });
      }
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
    assertSuperAdmin();
    const movCount = await prisma.movimientoStock.count({ where: { usuarioId: id } });
    if (movCount > 0) {
      throw new Error(
        `No se puede eliminar el usuario: tiene ${movCount} movimiento(s) de stock asociado(s).`,
      );
    }
    const snap = getAuthSession();
    if (snap?.usuarioId === id) {
      setAuthSession(null);
    }
    await prisma.usuario.delete({ where: { id } });
    return { ok: true };
  });
}
