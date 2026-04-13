import type { Prisma } from '../db/generated/client';

export type RolListPagedOpts = {
  page?: number;
  pageSize?: number;
  nombre?: string;
};

export function buildRolWhere(opts: RolListPagedOpts): Prisma.RolWhereInput {
  const nombre = typeof opts.nombre === 'string' ? opts.nombre.trim() : '';
  if (!nombre) {
    return {};
  }
  return { nombre: { contains: nombre } };
}
