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

export type ListPagedOpts = {
  page?: number;
  pageSize?: number;
  nombre?: string;
  sku?: string;
  status?: string;
  createdFrom?: string;
  createdTo?: string;
  updatedFrom?: string;
  updatedTo?: string;
};

export function buildProductoWhere(opts: ListPagedOpts): Prisma.ProductoWhereInput {
  const and: Prisma.ProductoWhereInput[] = [];

  const nombre = typeof opts.nombre === 'string' ? opts.nombre.trim() : '';
  if (nombre) {
    and.push({ nombre: { contains: nombre } });
  }

  const sku = typeof opts.sku === 'string' ? opts.sku.trim() : '';
  if (sku) {
    and.push({ sku: { contains: sku } });
  }

  if (opts.status === 'ACTIVE' || opts.status === 'INACTIVE') {
    and.push({ status: opts.status });
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
