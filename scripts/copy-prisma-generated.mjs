import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const src = path.join(root, 'src/main/db/generated');
const dest = path.join(root, 'dist/main/db/generated');

if (!fs.existsSync(src)) {
  console.error('[copy-prisma-generated] Falta', src, '— ejecuta npm run prisma:generate antes.');
  process.exit(1);
}
fs.rmSync(dest, { recursive: true, force: true });
fs.mkdirSync(path.dirname(dest), { recursive: true });
fs.cpSync(src, dest, { recursive: true });
console.log('[copy-prisma-generated]', dest);
