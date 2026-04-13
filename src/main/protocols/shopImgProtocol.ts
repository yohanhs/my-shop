import { protocol } from 'electron';
import fs from 'fs/promises';
import path from 'path';

const MIME: Record<string, string> = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
};

/** Debe ejecutarse antes de `app.ready` (requisito de Electron). */
export function registerShopImgPrivileges(): void {
  protocol.registerSchemesAsPrivileged([
    {
      scheme: 'shopimg',
      privileges: {
        standard: true,
        secure: true,
        supportFetchAPI: true,
        corsEnabled: true,
        stream: true,
      },
    },
  ]);
}

export function registerShopImgHandler(): void {
  if (protocol.isProtocolHandled('shopimg')) {
    protocol.unhandle('shopimg');
  }

  protocol.handle('shopimg', async (request) => {
    try {
      const u = new URL(request.url);
      const b64 = u.searchParams.get('p');
      if (!b64 || b64.length > 6000) {
        return new Response(null, { status: 400 });
      }
      const abs = Buffer.from(b64, 'base64url').toString('utf8');
      const normalized = path.normalize(abs);
      if (!path.isAbsolute(normalized)) {
        return new Response(null, { status: 400 });
      }
      await fs.access(normalized);
      const buf = await fs.readFile(normalized);
      const ext = path.extname(normalized).toLowerCase();
      const ct = MIME[ext] ?? 'application/octet-stream';
      return new Response(buf, {
        headers: {
          'content-type': ct,
          'cache-control': 'public, max-age=3600',
        },
      });
    } catch {
      return new Response(null, { status: 404 });
    }
  });
}
