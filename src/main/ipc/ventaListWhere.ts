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

export type VentaListPagedOpts = {
  page?: number;
  pageSize?: number;
  estado?: string;
  metodoPago?: string;
  fechaDesde?: string;
  fechaHasta?: string;
  ticketFolio?: string;
};

export function buildVentaWhere(opts: VentaListPagedOpts): Prisma.VentaWhereInput {
  const and: Prisma.VentaWhereInput[] = [];

  if (opts.estado === 'ACTIVA' || opts.estado === 'ANULADA') {
    and.push({ estado: opts.estado });
  }

  if (opts.metodoPago === 'EFECTIVO' || opts.metodoPago === 'TARJETA' || opts.metodoPago === 'TRANSFERENCIA') {
    and.push({ metodoPago: opts.metodoPago });
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

  const folio = typeof opts.ticketFolio === 'string' ? opts.ticketFolio.trim() : '';
  if (folio) {
    and.push({ ticketFolio: { contains: folio } });
  }

  if (and.length === 0) {
    return {};
  }
  return { AND: and };
}
