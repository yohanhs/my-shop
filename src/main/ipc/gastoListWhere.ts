import type { Prisma } from '../db/generated/client';

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function dayStart(dateStr: string): Date {
  const [y, m, d] = dateStr.split('-').map((x) => Number(x));
  return new Date(y, m - 1, d, 0, 0, 0, 0);
}

function dayEnd(dateStr: string): Date {
  const [y, m, d] = dateStr.split('-').map((x) => Number(x));
  return new Date(y, m - 1, d, 23, 59, 59, 999);
}

export type GastoListPagedOpts = {
  page?: number;
  pageSize?: number;
  concepto?: string;
  categoria?: string;
  /** Fecha del gasto YYYY-MM-DD */
  fechaDesde?: string;
  fechaHasta?: string;
};

export function buildGastoWhere(opts: GastoListPagedOpts): Prisma.GastoWhereInput {
  const and: Prisma.GastoWhereInput[] = [];

  const concepto = typeof opts.concepto === 'string' ? opts.concepto.trim() : '';
  if (concepto) {
    and.push({ concepto: { contains: concepto } });
  }

  const categoria = typeof opts.categoria === 'string' ? opts.categoria.trim() : '';
  if (categoria) {
    and.push({ categoria: { contains: categoria } });
  }

  const fd = typeof opts.fechaDesde === 'string' ? opts.fechaDesde.trim() : '';
  const fh = typeof opts.fechaHasta === 'string' ? opts.fechaHasta.trim() : '';
  if (fd || fh) {
    const range: Prisma.DateTimeFilter = {};
    if (fd && DATE_RE.test(fd)) range.gte = dayStart(fd);
    if (fh && DATE_RE.test(fh)) range.lte = dayEnd(fh);
    if (Object.keys(range).length > 0) {
      and.push({ fecha: range });
    }
  }

  if (and.length === 0) {
    return {};
  }
  return { AND: and };
}
