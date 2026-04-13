import { Prisma, type PrismaClient, type Rol, type Usuario } from '../db/generated/client';
import { ipcMain } from 'electron';
import bcrypt from 'bcryptjs';
import { getPrismaClient } from '../db/client';
import { getAuthSession, setAuthSession, type AuthSession } from '../auth/sessionStore';

const CHANNELS = ['auth:login', 'auth:logout', 'auth:getCurrentUser', 'auth:ensureAdmin'] as const;

/** Roles fijos del sistema (se crean en BD al arrancar; no hay pantalla de roles). */
const DEFAULT_ROLES = ['SuperAdmin', 'Cajero'] as const;

const DEFAULT_SUPER = {
  nombre: 'Super administrador',
  username: 'admin',
  password: 'admin123',
} as const;

function hashPassword(password: string): string {
  return bcrypt.hashSync(password, 10);
}

function verifyPassword(password: string, hash: string): boolean {
  return bcrypt.compareSync(password, hash);
}

/** Hash bcrypt completo (~60 caracteres) o no usable para login. */
function isProbablyBcryptHash(hash: string | null | undefined): boolean {
  if (!hash || hash.length < 50) return false;
  return /^\$2[aby]\$\d{2}\$/.test(hash);
}

function normalizeUsernameInput(raw: string): string {
  return raw.trim().replace(/[\u200B-\u200D\uFEFF]/g, '');
}

type UsuarioWithRol = Usuario & { rol: Rol };

/**
 * Carga rol aparte para no usar `include: { rol: true }` cuando `rolId` apunta a un `Rol` borrado
 * (Prisma lanza "Inconsistent query result" en ese caso).
 */
async function loadUsuarioWithRol(prisma: PrismaClient, row: Usuario): Promise<UsuarioWithRol | null> {
  let rol = await prisma.rol.findUnique({ where: { id: row.rolId } });
  if (!rol) {
    const superR = await prisma.rol.findUnique({ where: { nombre: 'SuperAdmin' } });
    const cajero = await prisma.rol.findUnique({ where: { nombre: 'Cajero' } });
    const fallback =
      row.username.toLowerCase() === DEFAULT_SUPER.username.toLowerCase()
        ? superR
        : cajero ?? superR;
    if (!fallback) return null;
    const updated = await prisma.usuario.update({
      where: { id: row.id },
      data: { rolId: fallback.id },
      include: { rol: true },
    });
    if (!updated.rol) return null;
    return updated as UsuarioWithRol;
  }
  return { ...row, rol };
}

/** Repara `rolId` que apuntan a filas inexistentes en `Rol` (migraciones / roles viejos). */
async function repairOrphanUsuarioRoles(
  prisma: PrismaClient,
  superRol: { id: number },
  cajeroRol: { id: number } | null,
): Promise<void> {
  const orphans = await prisma.$queryRawUnsafe<Array<{ id: number; username: string }>>(
    `SELECT u.id, u.username FROM usuarios u LEFT JOIN Rol r ON r.id = u.rolId WHERE r.id IS NULL`,
  );
  for (const o of orphans) {
    const destId =
      o.username.toLowerCase() === DEFAULT_SUPER.username.toLowerCase()
        ? superRol.id
        : cajeroRol?.id ?? superRol.id;
    await prisma.usuario.update({ where: { id: o.id }, data: { rolId: destId } });
    console.warn(`[auth] Reparado usuario "${o.username}": rolId huérfano → rol id ${destId}.`);
  }
}

/** Coincide con `DEFAULT_SUPER.username` ignorando mayúsculas (p. ej. "Admin" en BD antigua). */
async function findDefaultSuperUsuario(prisma: PrismaClient) {
  const rows = await prisma.$queryRawUnsafe<Array<{ id: number }>>(
    'SELECT id FROM usuarios WHERE lower(username) = lower(?) LIMIT 1',
    DEFAULT_SUPER.username,
  );
  if (!rows.length) return null;
  return prisma.usuario.findUnique({ where: { id: rows[0].id } });
}

async function findUsuarioForLogin(prisma: PrismaClient, username: string): Promise<UsuarioWithRol | null> {
  const u = normalizeUsernameInput(username);
  if (!u) return null;
  let row = await prisma.usuario.findUnique({ where: { username: u } });
  if (!row) {
    const rows = await prisma.$queryRawUnsafe<Array<{ id: number }>>(
      'SELECT id FROM usuarios WHERE lower(username) = lower(?) LIMIT 1',
      u,
    );
    if (!rows.length) return null;
    row = await prisma.usuario.findUnique({ where: { id: rows[0].id } });
  }
  if (!row) return null;
  return loadUsuarioWithRol(prisma, row);
}

/** Crea roles base y usuario `admin` con rol SuperAdmin si no existe (primera ejecución). */
export async function seedDefaultAuth(prisma: PrismaClient): Promise<void> {
  for (const nombre of DEFAULT_ROLES) {
    await prisma.rol.upsert({
      where: { nombre },
      update: {},
      create: { nombre },
    });
  }

  const superRol = await prisma.rol.findUnique({ where: { nombre: 'SuperAdmin' } });
  if (!superRol) {
    console.error('[auth] No existe el rol SuperAdmin tras asegurar roles; revisa la base de datos.');
    return;
  }

  const cajeroRol = await prisma.rol.findUnique({ where: { nombre: 'Cajero' } });
  await repairOrphanUsuarioRoles(prisma, superRol, cajeroRol);

  const existing = await findDefaultSuperUsuario(prisma);
  if (!existing) {
    try {
      await prisma.usuario.create({
        data: {
          nombre: DEFAULT_SUPER.nombre,
          username: DEFAULT_SUPER.username,
          passwordHash: hashPassword(DEFAULT_SUPER.password),
          rolId: superRol.id,
          status: 'ACTIVE',
        },
      });
      console.log('[auth] Usuario por defecto creado: admin / admin123 (cámbialo en producción).');
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        console.log('[auth] Usuario admin ya existía (clave duplicada).');
      } else {
        throw err;
      }
    }
    return;
  }

  const hash = existing.passwordHash;
  const defaultWorks = isProbablyBcryptHash(hash) && verifyPassword(DEFAULT_SUPER.password, hash);

  if (!isProbablyBcryptHash(hash)) {
    await prisma.usuario.update({
      where: { id: existing.id },
      data: {
        username: DEFAULT_SUPER.username,
        passwordHash: hashPassword(DEFAULT_SUPER.password),
        rolId: superRol.id,
        status: 'ACTIVE',
        nombre: DEFAULT_SUPER.nombre,
      },
    });
    console.warn(
      '[auth] Contraseña del usuario admin reparada (hash inválido o incompleto). Usa admin / admin123 y cámbiala.',
    );
    return;
  }

  if (defaultWorks && (existing.rolId !== superRol.id || existing.username !== DEFAULT_SUPER.username)) {
    await prisma.usuario.update({
      where: { id: existing.id },
      data: {
        rolId: superRol.id,
        ...(existing.username !== DEFAULT_SUPER.username ? { username: DEFAULT_SUPER.username } : {}),
      },
    });
    console.log('[auth] Usuario admin normalizado (rol SuperAdmin / nombre de usuario).');
  }
}

function sessionFromUsuario(usuario: {
  id: number;
  username: string;
  nombre: string;
  rolId: number;
  rol: { nombre: string };
}): AuthSession {
  return {
    usuarioId: usuario.id,
    username: usuario.username,
    nombre: usuario.nombre,
    rolId: usuario.rolId,
    rolNombre: usuario.rol.nombre,
  };
}

export function registerAuthIpc(): void {
  const prisma = getPrismaClient();

  for (const ch of CHANNELS) {
    ipcMain.removeHandler(ch);
  }

  ipcMain.handle('auth:ensureAdmin', async () => {
    try {
      await seedDefaultAuth(prisma);
      return true;
    } catch (err) {
      console.error('[auth] ensureAdmin:', err);
      return false;
    }
  });

  ipcMain.handle('auth:login', async (_e, username: string, password: string) => {
    const userTrim = normalizeUsernameInput(typeof username === 'string' ? username : String(username ?? ''));
    const passRaw = typeof password === 'string' ? password : String(password ?? '');
    if (!userTrim || !passRaw) {
      throw new Error('Usuario y contraseña requeridos.');
    }

    await seedDefaultAuth(prisma);

    const usuario = await findUsuarioForLogin(prisma, userTrim);

    if (!usuario) {
      throw new Error('Usuario o contraseña incorrectos.');
    }

    if (usuario.status !== 'ACTIVE') {
      throw new Error('Usuario inactivo.');
    }

    const passTry = [passRaw, passRaw.trimEnd(), passRaw.trim()];
    const passOk = passTry.some((p) => p.length > 0 && verifyPassword(p, usuario.passwordHash));
    if (!passOk) {
      throw new Error('Usuario o contraseña incorrectos.');
    }

    const session = sessionFromUsuario(usuario);
    setAuthSession(session);

    return {
      usuarioId: session.usuarioId,
      username: session.username,
      nombre: session.nombre,
      rolNombre: session.rolNombre,
    };
  });

  ipcMain.handle('auth:getCurrentUser', async () => {
    const snap = getAuthSession();
    if (!snap) return null;

    const row = await prisma.usuario.findUnique({ where: { id: snap.usuarioId } });

    if (!row || row.status !== 'ACTIVE') {
      setAuthSession(null);
      return null;
    }

    const usuario = await loadUsuarioWithRol(prisma, row);
    if (!usuario) {
      setAuthSession(null);
      return null;
    }

    const session = sessionFromUsuario(usuario);
    setAuthSession(session);

    return {
      usuarioId: session.usuarioId,
      username: session.username,
      nombre: session.nombre,
      rolNombre: session.rolNombre,
    };
  });

  ipcMain.handle('auth:logout', async () => {
    setAuthSession(null);
    return true;
  });
}
