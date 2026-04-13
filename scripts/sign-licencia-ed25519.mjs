#!/usr/bin/env node
/**
 * Firma licencia.lic (JSON) con clave privada Ed25519 PEM (alineado con src/main/licenseManager.js).
 *
 * Uso:
 *   node scripts/sign-licencia-ed25519.mjs --private-key ./ed25519-private.pem --out ./licencia.lic
 *
 * machineId por defecto = salida de node-machine-id en esta máquina. Opcional: --machine-id <id>
 * --expires-at ISO8601
 */

import { sign } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import machineIdPkg from 'node-machine-id';

const { machineIdSync } = machineIdPkg;

function arg(name, def) {
  const i = process.argv.indexOf(name);
  if (i === -1 || !process.argv[i + 1]) return def;
  return process.argv[i + 1];
}

const privateKeyPath = arg('--private-key', '');
const outPath = arg('--out', '');
const expiresAt = arg('--expires-at', '2099-12-31T23:59:59.000Z');
const machineIdArg = arg('--machine-id', '');

if (!privateKeyPath || !outPath) {
  console.error(
    'Uso: node scripts/sign-licencia-ed25519.mjs --private-key ./priv.pem --out ./licencia.lic [--expires-at ISO] [--machine-id ...]',
  );
  process.exit(1);
}

const keyPem = fs.readFileSync(path.resolve(privateKeyPath), 'utf8');
const machineId = machineIdArg || machineIdSync();
const data = { machineId, expiresAt };
const message = Buffer.from(JSON.stringify(data), 'utf8');

const signature = sign(null, message, keyPem).toString('base64');

const doc = { data, signature };
fs.writeFileSync(path.resolve(outPath), JSON.stringify(doc, null, 2), 'utf8');
console.log('Escrito:', path.resolve(outPath), '| machineId:', machineId);
