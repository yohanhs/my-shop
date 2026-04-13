import { PrismaClient } from './generated/client';
import { app } from 'electron';
import path from 'path';
import fs from 'fs';
import fsp from 'fs/promises';

let prisma: PrismaClient | undefined;

export function getDbPath(): string {
  const userDataPath = app.getPath('userData');
  const dbDir = path.join(userDataPath, 'data');

  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }

  return path.join(dbDir, 'my-shop.db');
}

/**
 * Aplica todas las migraciones SQL pendientes directamente sobre la BD de userData.
 * Prisma migrate no funciona bien en runtime de Electron empaquetado,
 * así que leemos los .sql y los ejecutamos con sqlite3 via Prisma.$executeRawUnsafe.
 */
async function applyMigrations(client: PrismaClient): Promise<void> {
  // Verificar si las tablas ya existen consultando sqlite_master
  const tables: Array<{ name: string }> = await client.$queryRawUnsafe(
    `SELECT name FROM sqlite_master WHERE type='table' AND name='productos'`
  );

  if (tables.length > 0) {
    return; // Las tablas ya existen, no hay que migrar
  }

  console.log('[DB] Base de datos vacía, aplicando migraciones...');

  // Buscar archivos de migración en orden
  const migrationsDir = path.join(__dirname, '../db/migrations');
  // En desarrollo, las migraciones están junto al source
  const devMigrationsDir = path.join(process.cwd(), 'src/main/db/migrations');

  const migDir = fs.existsSync(migrationsDir) ? migrationsDir : devMigrationsDir;

  if (!fs.existsSync(migDir)) {
    console.error('[DB] No se encontró el directorio de migraciones:', migDir);
    return;
  }

  const migrationFolders = fs.readdirSync(migDir).sort();

  for (const folder of migrationFolders) {
    const sqlPath = path.join(migDir, folder, 'migration.sql');
    if (!fs.existsSync(sqlPath)) continue;

    const sql = fs.readFileSync(sqlPath, 'utf-8');
    // Separar por statements y ejecutar uno a uno
    // No filtrar por startsWith('--'): cada sentencia de Prisma empieza con
    // "-- CreateTable" en la misma pieza que el CREATE; eso eliminaba todo el SQL.
    const statements = sql
      .split(';')
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    for (const stmt of statements) {
      await client.$executeRawUnsafe(stmt);
    }
    console.log(`[DB] Migración aplicada: ${folder}`);
  }

  console.log('[DB] Todas las migraciones aplicadas.');
}

async function tableExists(client: PrismaClient, name: string): Promise<boolean> {
  const rows = await client.$queryRawUnsafe<Array<{ name: string }>>(
    `SELECT name FROM sqlite_master WHERE type='table' AND name=?`,
    name,
  );
  return rows.length > 0;
}

/**
 * Bases antiguas o parciales pueden tener `productos` sin `usuarios`/`Rol` porque
 * `applyMigrations` salía en cuanto existía productos. Sin estas tablas el login falla siempre.
 */
async function ensureAuthTables(client: PrismaClient): Promise<void> {
  const hasRol = await tableExists(client, 'Rol');
  const hasUsuarios = await tableExists(client, 'usuarios');
  if (hasRol && hasUsuarios) return;

  console.warn('[DB] Faltan tablas Rol o usuarios; creando esquema mínimo de autenticación (IF NOT EXISTS).');

  if (!hasRol) {
    await client.$executeRawUnsafe(`
CREATE TABLE IF NOT EXISTS "Rol" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "nombre" TEXT NOT NULL
)`);
    await client.$executeRawUnsafe(
      `CREATE UNIQUE INDEX IF NOT EXISTS "Rol_nombre_key" ON "Rol"("nombre")`,
    );
  }

  if (!hasUsuarios) {
    await client.$executeRawUnsafe(`
CREATE TABLE IF NOT EXISTS "usuarios" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "nombre" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "rolId" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "usuarios_rolId_fkey" FOREIGN KEY ("rolId") REFERENCES "Rol" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
)`);
    await client.$executeRawUnsafe(
      `CREATE UNIQUE INDEX IF NOT EXISTS "usuarios_username_key" ON "usuarios"("username")`,
    );
  }
}

/** BD ya creadas antes de añadir columnas nuevas: ALTER si falta `descripcion`. */
async function ensureProductoDescripcionColumn(client: PrismaClient): Promise<void> {
  const tables: Array<{ name: string }> = await client.$queryRawUnsafe(
    `SELECT name FROM sqlite_master WHERE type='table' AND name='productos'`,
  );
  if (tables.length === 0) return;

  const columns = await client.$queryRawUnsafe<Array<{ name: string }>>(
    `PRAGMA table_info(productos)`,
  );
  if (columns.some((c) => c.name === 'descripcion')) return;

  await client.$executeRawUnsafe(`ALTER TABLE productos ADD COLUMN descripcion TEXT`);
  console.log('[DB] Columna productos.descripcion añadida (migración incremental).');
}

async function ensureConfiguracionImagenesDirColumn(client: PrismaClient): Promise<void> {
  const tables: Array<{ name: string }> = await client.$queryRawUnsafe(
    `SELECT name FROM sqlite_master WHERE type='table' AND name='configuracion'`,
  );
  if (tables.length === 0) return;

  const columns = await client.$queryRawUnsafe<Array<{ name: string }>>(
    `PRAGMA table_info(configuracion)`,
  );
  if (columns.some((c) => c.name === 'imagenes_dir_default')) return;

  await client.$executeRawUnsafe(
    `ALTER TABLE configuracion ADD COLUMN imagenes_dir_default TEXT`,
  );
  console.log('[DB] Columna configuracion.imagenes_dir_default añadida (migración incremental).');
}

async function ensureConfiguracionDepreciacionMensualColumn(client: PrismaClient): Promise<void> {
  const tables: Array<{ name: string }> = await client.$queryRawUnsafe(
    `SELECT name FROM sqlite_master WHERE type='table' AND name='configuracion'`,
  );
  if (tables.length === 0) return;

  const columns = await client.$queryRawUnsafe<Array<{ name: string }>>(
    `PRAGMA table_info(configuracion)`,
  );
  if (columns.some((c) => c.name === 'depreciacion_mensual')) return;

  await client.$executeRawUnsafe(
    `ALTER TABLE configuracion ADD COLUMN depreciacion_mensual REAL NOT NULL DEFAULT 0`,
  );
  console.log('[DB] Columna configuracion.depreciacion_mensual añadida (migración incremental).');
}

async function ensureConfiguracionFondoAppPathColumn(client: PrismaClient): Promise<void> {
  const tables: Array<{ name: string }> = await client.$queryRawUnsafe(
    `SELECT name FROM sqlite_master WHERE type='table' AND name='configuracion'`,
  );
  if (tables.length === 0) return;

  const columns = await client.$queryRawUnsafe<Array<{ name: string }>>(
    `PRAGMA table_info(configuracion)`,
  );
  if (columns.some((c) => c.name === 'fondo_app_path')) return;

  await client.$executeRawUnsafe(`ALTER TABLE configuracion ADD COLUMN fondo_app_path TEXT`);
  console.log('[DB] Columna configuracion.fondo_app_path añadida (migración incremental).');
}

async function ensureProductoFechaCaducidadColumn(client: PrismaClient): Promise<void> {
  const tables: Array<{ name: string }> = await client.$queryRawUnsafe(
    `SELECT name FROM sqlite_master WHERE type='table' AND name='productos'`,
  );
  if (tables.length === 0) return;

  const columns = await client.$queryRawUnsafe<Array<{ name: string }>>(
    `PRAGMA table_info(productos)`,
  );
  if (columns.some((c) => c.name === 'fecha_caducidad')) return;

  await client.$executeRawUnsafe(`ALTER TABLE productos ADD COLUMN fecha_caducidad DATETIME`);
  console.log('[DB] Columna productos.fecha_caducidad añadida (migración incremental).');
}

async function ensureVentaUsuarioIdColumn(client: PrismaClient): Promise<void> {
  const tables = await client.$queryRawUnsafe<Array<{ name: string }>>(
    `SELECT name FROM sqlite_master WHERE type='table' AND name='ventas'`,
  );
  if (tables.length === 0) return;

  const columns = await client.$queryRawUnsafe<Array<{ name: string }>>(
    `PRAGMA table_info(ventas)`,
  );
  if (columns.some((c) => c.name === 'usuario_id')) return;

  await client.$executeRawUnsafe(
    `ALTER TABLE ventas ADD COLUMN usuario_id INTEGER REFERENCES usuarios(id)`,
  );
  console.log('[DB] Columna ventas.usuario_id añadida (cajero / filtrado de ventas).');
}

export function getPrismaClient(): PrismaClient {
  if (!prisma) {
    const dbPath = getDbPath();
    prisma = new PrismaClient({
      datasources: {
        db: {
          url: `file:${dbPath}`,
        },
      },
    });
  }
  return prisma;
}

const SQLITE_MAGIC = 'SQLite format 3';

function assertSqliteFileHeaderSync(filePath: string): void {
  const fd = fs.openSync(filePath, 'r');
  try {
    const buf = Buffer.alloc(16);
    fs.readSync(fd, buf, 0, 16, 0);
    const head = buf.toString('utf8', 0, 16);
    if (!head.startsWith(SQLITE_MAGIC)) {
      throw new Error('El archivo no parece una base SQLite de esta aplicación.');
    }
  } finally {
    fs.closeSync(fd);
  }
}

/** Copia la BD activa (y archivos -wal / -shm si existen) a otra ruta. */
export async function copyCurrentDatabaseTo(destPathRaw: string): Promise<string> {
  let out = path.resolve(String(destPathRaw).trim());
  if (!out.toLowerCase().endsWith('.db')) {
    out += '.db';
  }
  const src = getDbPath();
  await fsp.copyFile(src, out);
  for (const suf of ['-wal', '-shm'] as const) {
    try {
      await fsp.access(src + suf);
      await fsp.copyFile(src + suf, out + suf);
    } catch {
      /* sin WAL o sin copia */
    }
  }
  return out;
}

/**
 * Sustituye `my-shop.db` por una copia del archivo indicado y reinicializa Prisma.
 * Cierra conexiones, borra posibles `-wal`/`-shm` viejos junto al destino y vuelve a abrir.
 */
export async function importDatabaseFromFile(sourcePath: string): Promise<void> {
  const resolved = path.resolve(String(sourcePath).trim());
  const st = await fsp.stat(resolved).catch(() => null);
  if (!st?.isFile()) {
    throw new Error('No se encontró el archivo de respaldo.');
  }
  assertSqliteFileHeaderSync(resolved);

  await disconnectPrisma();
  const dest = getDbPath();
  const dir = path.dirname(dest);
  await fsp.mkdir(dir, { recursive: true });
  for (const suf of ['-wal', '-shm'] as const) {
    try {
      await fsp.unlink(dest + suf);
    } catch {
      /* ok */
    }
  }
  await fsp.copyFile(resolved, dest);
  await initializeDatabase();
}

export async function initializeDatabase(): Promise<PrismaClient> {
  const client = getPrismaClient();
  await client.$connect();
  await applyMigrations(client);
  await ensureAuthTables(client);
  await ensureProductoDescripcionColumn(client);
  await ensureConfiguracionImagenesDirColumn(client);
  await ensureConfiguracionFondoAppPathColumn(client);
  await ensureConfiguracionDepreciacionMensualColumn(client);
  await ensureProductoFechaCaducidadColumn(client);
  await ensureVentaUsuarioIdColumn(client);
  return client;
}

export async function disconnectPrisma(): Promise<void> {
  if (prisma) {
    await prisma.$disconnect();
    prisma = undefined;
  }
}
