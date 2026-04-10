import type { Prisma } from '@prisma/client';

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function dayStart(dateStr: string): Date {
  const [y, m, d] = dateStr.split('-').map((x) => Number(x));
  return new Date(y, m - 1, d, 0, 0, 0, 0);
}

function dayEnd(dateStr: string): Date {
  const [y, m, d] = dateStr.split('-').map((x) => Number(x));
  return new Date(y, m - 1, d, 23, 59, 59, 999);
}

export type ProveedorListPagedOpts = {
  page?: number;
  pageSize?: number;
  nombre?: string;
  empresa?: string;
  telefono?: string;
  email?: string;
  createdFrom?: string;
  createdTo?: string;
  updatedFrom?: string;
  updatedTo?: string;
};

export function buildProveedorWhere(opts: ProveedorListPagedOpts): Prisma.ProveedorWhereInput {
  const and: Prisma.ProveedorWhereInput[] = [];

  const nombre = typeof opts.nombre === 'string' ? opts.nombre.trim() : '';
  if (nombre) {
    and.push({ nombre: { contains: nombre } });
  }

  const empresa = typeof opts.empresa === 'string' ? opts.empresa.trim() : '';
  if (empresa) {
    and.push({ empresa: { contains: empresa } });
  }

  const telefono = typeof opts.telefono === 'string' ? opts.telefono.trim() : '';
  if (telefono) {
    and.push({ telefono: { contains: telefono } });
  }

  const email = typeof opts.email === 'string' ? opts.email.trim() : '';
  if (email) {
    and.push({ email: { contains: email } });
  }

  const cf = typeof opts.createdFrom === 'string' ? opts.createdFrom.trim() : '';
  const ct = typeof opts.createdTo === 'string' ? opts.createdTo.trim() : '';
  if (cf || ct) {
    const range: Prisma.DateTimeFilter = {};
    if (cf && DATE_RE.test(cf)) range.gte = dayStart(cf);
    if (ct && DATE_RE.test(ct)) range.lte = dayEnd(ct);
    if (Object.keys(range).length > 0) {
      and.push({ createdAt: range });
    }
  }

  const uf = typeof opts.updatedFrom === 'string' ? opts.updatedFrom.trim() : '';
  const ut = typeof opts.updatedTo === 'string' ? opts.updatedTo.trim() : '';
  if (uf || ut) {
    const range: Prisma.DateTimeFilter = {};
    if (uf && DATE_RE.test(uf)) range.gte = dayStart(uf);
    if (ut && DATE_RE.test(ut)) range.lte = dayEnd(ut);
    if (Object.keys(range).length > 0) {
      and.push({ updatedAt: range });
    }
  }

  if (and.length === 0) {
    return {};
  }
  return { AND: and };
}
