import { PrismaClient } from '@prisma/client';
import { app } from 'electron';
import path from 'path';
import fs from 'fs';
let prisma: PrismaClient;

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
    const statements = sql
      .split(';')
      .map((s) => s.trim())
      .filter((s) => s.length > 0 && !s.startsWith('--'));

    for (const stmt of statements) {
      await client.$executeRawUnsafe(stmt);
    }
    console.log(`[DB] Migración aplicada: ${folder}`);
  }

  console.log('[DB] Todas las migraciones aplicadas.');
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

export async function initializeDatabase(): Promise<PrismaClient> {
  const client = getPrismaClient();
  await client.$connect();
  await applyMigrations(client);
  return client;
}

export async function disconnectPrisma(): Promise<void> {
  if (prisma) {
    await prisma.$disconnect();
  }
}
