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

export type MermaListPagedOpts = {
  page?: number;
  pageSize?: number;
  /** Texto libre sobre nombre o SKU del producto. */
  productoBuscar?: string;
  /** Fecha del movimiento YYYY-MM-DD */
  fechaDesde?: string;
  fechaHasta?: string;
};

export function buildMermaWhere(opts: MermaListPagedOpts): Prisma.MovimientoStockWhereInput {
  const and: Prisma.MovimientoStockWhereInput[] = [{ motivo: 'MERMA' }];

  const buscar = typeof opts.productoBuscar === 'string' ? opts.productoBuscar.trim() : '';
  if (buscar) {
    and.push({
      producto: {
        OR: [{ nombre: { contains: buscar } }, { sku: { contains: buscar } }],
      },
    });
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

  return { AND: and };
}
