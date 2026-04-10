import { ipcMain } from 'electron';
import { getPrismaClient } from '../db/client';
import { buildProveedorWhere, type ProveedorListPagedOpts } from './proveedorListWhere';

const PROVEEDOR_CHANNELS = [
  'proveedor:listPaged',
  'proveedor:getById',
  'proveedor:create',
  'proveedor:update',
  'proveedor:delete',
] as const;

function toProveedorDto(p: {
  id: number;
  nombre: string;
  telefono: string | null;
  empresa: string | null;
  direccion: string | null;
  email: string | null;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: p.id,
    nombre: p.nombre,
    telefono: p.telefono,
    empresa: p.empresa,
    direccion: p.direccion,
    email: p.email,
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
  };
}

function normOpt(v: unknown): string | null | undefined {
  if (v === undefined) return undefined;
  if (v === null) return null;
  if (typeof v !== 'string') return undefined;
  const t = v.trim();
  return t.length === 0 ? null : t;
}

export function registerProveedorIpc(): void {
  const prisma = getPrismaClient();

  for (const ch of PROVEEDOR_CHANNELS) {
    ipcMain.removeHandler(ch);
  }

  ipcMain.handle('proveedor:listPaged', async (_event, opts: ProveedorListPagedOpts) => {
    const page = Math.max(1, Math.floor(Number(opts?.page) || 1));
    const rawSize = Math.floor(Number(opts?.pageSize) || 10);
    const pageSize = Math.min(100, Math.max(1, rawSize));
    const skip = (page - 1) * pageSize;
    const where = buildProveedorWhere(opts);

    const [rows, total] = await Promise.all([
      prisma.proveedor.findMany({
        where,
        orderBy: { nombre: 'asc' },
        skip,
        take: pageSize,
      }),
      prisma.proveedor.count({ where }),
    ]);

    const items = rows.map(toProveedorDto);
    return { items, total, page, pageSize };
  });

  ipcMain.handle('proveedor:getById', async (_event, id: number) => {
    const p = await prisma.proveedor.findUnique({ where: { id } });
    return p ? toProveedorDto(p) : null;
  });

  ipcMain.handle(
    'proveedor:create',
    async (
      _event,
      data: {
        nombre: string;
        telefono?: string | null;
        empresa?: string | null;
        direccion?: string | null;
        email?: string | null;
      },
    ) => {
      const p = await prisma.proveedor.create({
        data: {
          nombre: data.nombre.trim(),
          telefono: normOpt(data.telefono) ?? null,
          empresa: normOpt(data.empresa) ?? null,
          direccion: normOpt(data.direccion) ?? null,
          email: normOpt(data.email) ?? null,
        },
      });
      return toProveedorDto(p);
    },
  );

  ipcMain.handle(
    'proveedor:update',
    async (
      _event,
      id: number,
      data: {
        nombre?: string;
        telefono?: string | null;
        empresa?: string | null;
        direccion?: string | null;
        email?: string | null;
      },
    ) => {
      const payload: {
        nombre?: string;
        telefono?: string | null;
        empresa?: string | null;
        direccion?: string | null;
        email?: string | null;
      } = {};
      if (data.nombre !== undefined) payload.nombre = data.nombre.trim();
      if (data.telefono !== undefined) payload.telefono = normOpt(data.telefono) ?? null;
      if (data.empresa !== undefined) payload.empresa = normOpt(data.empresa) ?? null;
      if (data.direccion !== undefined) payload.direccion = normOpt(data.direccion) ?? null;
      if (data.email !== undefined) payload.email = normOpt(data.email) ?? null;

      const p = await prisma.proveedor.update({
        where: { id },
        data: payload,
      });
      return toProveedorDto(p);
    },
  );

  ipcMain.handle('proveedor:delete', async (_event, id: number) => {
    const p = await prisma.proveedor.delete({ where: { id } });
    return toProveedorDto(p);
  });
}
