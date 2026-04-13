import { app, BrowserWindow, dialog, ipcMain, type OpenDialogOptions } from 'electron';
import fs from 'fs/promises';
import path from 'path';
import { Prisma } from '../db/generated/client';

import { assertNotCajero } from '../auth/sessionStore';
import { getPrismaClient } from '../db/client';

const CHANNELS = ['file:importImage', 'file:pickImageFile', 'file:pickImagesDirectory'] as const;

const IMAGE_EXT = new Set(['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg']);

function extOf(filePath: string): string {
  return path.extname(filePath).toLowerCase();
}

function isAllowedImage(filePath: string): boolean {
  return IMAGE_EXT.has(extOf(filePath));
}

function sanitizeFileBase(base: string): string {
  const n = base.replace(/[^a-zA-Z0-9._-]+/g, '_').replace(/_+/g, '_');
  return n.length > 0 ? n.slice(0, 120) : 'imagen';
}

async function resolveDestDir(): Promise<string> {
  const prisma = getPrismaClient();
  type ConfigDirRow = { imagenes_dir_default: string | null };
  const rows = await prisma.$queryRaw<ConfigDirRow[]>(
    Prisma.sql`SELECT imagenes_dir_default FROM configuracion ORDER BY id ASC LIMIT 1`,
  );
  const configured = rows[0]?.imagenes_dir_default?.trim();
  if (configured && configured.length > 0) {
    return path.resolve(configured);
  }
  return path.join(app.getPath('userData'), 'shop-images');
}

function parentWindowFromEvent(sender: Electron.WebContents): BrowserWindow | null {
  return BrowserWindow.fromWebContents(sender);
}

export function registerFileIpc(): void {
  for (const ch of CHANNELS) {
    ipcMain.removeHandler(ch);
  }

  ipcMain.handle('file:importImage', async (_event, sourcePathRaw: unknown) => {
    assertNotCajero();
    if (typeof sourcePathRaw !== 'string' || sourcePathRaw.trim().length === 0) {
      throw new Error('Ruta de imagen inválida.');
    }
    const sourcePath = path.resolve(sourcePathRaw.trim());
    if (!isAllowedImage(sourcePath)) {
      throw new Error('Formato no permitido. Usa JPG, PNG, GIF, WebP o SVG.');
    }

    let st: Awaited<ReturnType<typeof fs.stat>>;
    try {
      st = await fs.stat(sourcePath);
    } catch {
      throw new Error('No se encontró el archivo de origen.');
    }
    if (!st.isFile()) {
      throw new Error('La ruta no es un archivo.');
    }

    const destDir = await resolveDestDir();
    await fs.mkdir(destDir, { recursive: true });

    const base = sanitizeFileBase(path.basename(sourcePath));
    const destPath = path.join(destDir, `${Date.now()}-${base}`);

    await fs.copyFile(sourcePath, destPath);
    return { path: destPath };
  });

  ipcMain.handle('file:pickImageFile', async (event) => {
    assertNotCajero();
    const win = parentWindowFromEvent(event.sender);
    const opts: OpenDialogOptions = {
      properties: ['openFile'],
      filters: [{ name: 'Imágenes', extensions: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'] }],
    };
    const r = win ? await dialog.showOpenDialog(win, opts) : await dialog.showOpenDialog(opts);
    if (r.canceled || r.filePaths.length === 0) {
      return null;
    }
    return r.filePaths[0];
  });

  ipcMain.handle('file:pickImagesDirectory', async (event) => {
    assertNotCajero();
    const win = parentWindowFromEvent(event.sender);
    const dirOpts: OpenDialogOptions = {
      properties: ['openDirectory', 'createDirectory'],
    };
    const r = win ? await dialog.showOpenDialog(win, dirOpts) : await dialog.showOpenDialog(dirOpts);
    if (r.canceled || r.filePaths.length === 0) {
      return null;
    }
    return r.filePaths[0];
  });
}
