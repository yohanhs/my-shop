import { ipcMain } from 'electron';
import type { PrismaClient } from '../db/generated/client';

import { assertNotCajero } from '../auth/sessionStore';
import { getPrismaClient } from '../db/client';

const CHANNELS = ['stats:getHomeDashboard'] as const;

type HomeDashboardRangePayload = {
  desde: string;
  hasta: string;
};

function startOfMonth(year: number, month0: number): Date {
  return new Date(year, month0, 1, 0, 0, 0, 0);
}

function endOfMonth(year: number, month0: number): Date {
  return new Date(year, month0 + 1, 0, 23, 59, 59, 999);
}

/** yyyy-MM-dd → inicio del día local; `null` si inválida. */
function parseYmdLocalStart(ymd: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(ymd.trim());
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]) - 1;
  const d = Number(m[3]);
  const dt = new Date(y, mo, d, 0, 0, 0, 0);
  if (dt.getFullYear() !== y || dt.getMonth() !== mo || dt.getDate() !== d) return null;
  return dt;
}

/** Fin del día local (23:59:59.999) para una fecha yyyy-MM-dd. */
function parseYmdLocalEnd(ymd: string): Date | null {
  const s = parseYmdLocalStart(ymd);
  if (!s) return null;
  const e = new Date(s);
  e.setHours(23, 59, 59, 999);
  return e;
}

function inclusiveDayCount(start: Date, end: Date): number {
  const a = Date.UTC(start.getFullYear(), start.getMonth(), start.getDate());
  const b = Date.UTC(end.getFullYear(), end.getMonth(), end.getDate());
  return Math.floor((b - a) / 86400000) + 1;
}

/** Prorrateo simple: mensual × (días del periodo / 30). */
function depreciacionEstimadaEnPeriodo(mensual: number, desde: Date, hasta: Date): number {
  if (!Number.isFinite(mensual) || mensual <= 0) return 0;
  const dias = inclusiveDayCount(desde, hasta);
  return (mensual / 30) * dias;
}

async function sumCostoVentasPeriodo(prisma: PrismaClient, desde: Date, hasta: Date): Promise<number> {
  const rows = await prisma.$queryRaw<{ s: unknown }[]>`
    SELECT COALESCE(SUM(CAST(vd.cantidad AS REAL) * vd.precio_costo_unitario_historico), 0) AS s
    FROM venta_detalles vd
    INNER JOIN ventas v ON v.id = vd.venta_id
    WHERE v.estado = 'ACTIVA' AND v.fecha >= ${desde} AND v.fecha <= ${hasta}
  `;
  return Number(rows[0]?.s ?? 0);
}

/** Costo estimado de mermas: Σ cantidad × costo actual del producto (no hay costo histórico en el movimiento). */
async function sumCostoMermasPeriodo(prisma: PrismaClient, desde: Date, hasta: Date): Promise<number> {
  const rows = await prisma.$queryRaw<{ s: unknown }[]>`
    SELECT COALESCE(SUM(CAST(ms.cantidad AS REAL) * p.precio_costo), 0) AS s
    FROM movimientos_stock ms
    INNER JOIN productos p ON p.id = ms.producto_id
    WHERE ms.motivo = 'MERMA' AND ms.tipo = 'SALIDA'
      AND ms.fecha >= ${desde} AND ms.fecha <= ${hasta}
  `;
  return Number(rows[0]?.s ?? 0);
}

/** Periodo inmediatamente anterior con el mismo número de días naturales (inclusive). */
function previousPeriodSameLength(curStart: Date, curEnd: Date): { prevStart: Date; prevEnd: Date } {
  const nDays = inclusiveDayCount(curStart, curEnd);
  const prevEnd = new Date(curStart);
  prevEnd.setDate(prevEnd.getDate() - 1);
  prevEnd.setHours(23, 59, 59, 999);
  const prevStart = new Date(prevEnd.getFullYear(), prevEnd.getMonth(), prevEnd.getDate(), 0, 0, 0, 0);
  prevStart.setDate(prevStart.getDate() - (nDays - 1));
  return { prevStart, prevEnd };
}

/** Variación % periodo anterior; `null` si el periodo anterior fue 0 (sin base). */
function pctMom(actual: number, anterior: number): number | null {
  if (anterior === 0) return null;
  return ((actual - anterior) / anterior) * 100;
}

function monthShortEs(year: number, month0: number): string {
  return new Intl.DateTimeFormat('es-MX', { month: 'short' }).format(new Date(year, month0, 1));
}

function formatRangeLabelEs(start: Date, end: Date): string {
  const sameYear = start.getFullYear() === end.getFullYear();
  const sameMonth = sameYear && start.getMonth() === end.getMonth();
  const sameDay = sameMonth && start.getDate() === end.getDate();
  if (sameDay) {
    return new Intl.DateTimeFormat('es-MX', { day: 'numeric', month: 'short', year: 'numeric' }).format(start);
  }
  const optStart: Intl.DateTimeFormatOptions = sameYear
    ? { day: 'numeric', month: 'short' }
    : { day: 'numeric', month: 'short', year: 'numeric' };
  const optEnd: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short', year: 'numeric' };
  const a = new Intl.DateTimeFormat('es-MX', optStart).format(start);
  const b = new Intl.DateTimeFormat('es-MX', optEnd).format(end);
  return `${a} – ${b}`;
}

function resolveRange(payload?: HomeDashboardRangePayload | null): {
  curStart: Date;
  curEnd: Date;
  prevStart: Date;
  prevEnd: Date;
} {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();

  let curStart: Date;
  let curEnd: Date;

  const rawDesde = payload?.desde?.trim();
  const rawHasta = payload?.hasta?.trim();
  if (rawDesde && rawHasta) {
    const a = parseYmdLocalStart(rawDesde);
    const b = parseYmdLocalEnd(rawHasta);
    if (!a || !b) {
      throw new Error('Rango de fechas inválido. Usa el formato AAAA-MM-DD.');
    }
    if (a > b) {
      throw new Error('La fecha de inicio no puede ser posterior a la de fin.');
    }
    curStart = a;
    curEnd = b;
  } else {
    curStart = startOfMonth(y, m);
    curEnd = endOfMonth(y, m);
  }

  const { prevStart, prevEnd } = previousPeriodSameLength(curStart, curEnd);
  return { curStart, curEnd, prevStart, prevEnd };
}

export function registerStatsIpc(): void {
  const prisma = getPrismaClient();

  for (const ch of CHANNELS) {
    ipcMain.removeHandler(ch);
  }

  ipcMain.handle('stats:getHomeDashboard', async (_e, payload?: HomeDashboardRangePayload | null) => {
    assertNotCajero();
    const { curStart, curEnd, prevStart, prevEnd } = resolveRange(payload ?? undefined);

    const [ingAct, ingPrev, gasAct, gasPrev, venAct, venPrev, cfg] = await Promise.all([
      prisma.venta.aggregate({
        where: { estado: 'ACTIVA', fecha: { gte: curStart, lte: curEnd } },
        _sum: { total: true },
        _count: true,
      }),
      prisma.venta.aggregate({
        where: { estado: 'ACTIVA', fecha: { gte: prevStart, lte: prevEnd } },
        _sum: { total: true },
        _count: true,
      }),
      prisma.gasto.aggregate({
        where: { fecha: { gte: curStart, lte: curEnd } },
        _sum: { monto: true },
      }),
      prisma.gasto.aggregate({
        where: { fecha: { gte: prevStart, lte: prevEnd } },
        _sum: { monto: true },
      }),
      prisma.venta.count({
        where: { estado: 'ACTIVA', fecha: { gte: curStart, lte: curEnd } },
      }),
      prisma.venta.count({
        where: { estado: 'ACTIVA', fecha: { gte: prevStart, lte: prevEnd } },
      }),
      prisma.configuracion.findFirst({
        orderBy: { id: 'asc' },
        select: { moneda: true, depreciacionMensual: true },
      }),
    ]);

    const ingresosActual = ingAct._sum.total ?? 0;
    const ingresosAnterior = ingPrev._sum.total ?? 0;
    const gastosActual = gasAct._sum.monto ?? 0;
    const gastosAnterior = gasPrev._sum.monto ?? 0;

    const deprecMensual = cfg?.depreciacionMensual ?? 0;
    const [cogsActual, cogsAnterior, mermasActual, mermasAnterior] = await Promise.all([
      sumCostoVentasPeriodo(prisma, curStart, curEnd),
      sumCostoVentasPeriodo(prisma, prevStart, prevEnd),
      sumCostoMermasPeriodo(prisma, curStart, curEnd),
      sumCostoMermasPeriodo(prisma, prevStart, prevEnd),
    ]);
    const depActual = depreciacionEstimadaEnPeriodo(deprecMensual, curStart, curEnd);
    const depAnterior = depreciacionEstimadaEnPeriodo(deprecMensual, prevStart, prevEnd);

    const netActual = ingresosActual - cogsActual - gastosActual - depActual - mermasActual;
    const netAnterior = ingresosAnterior - cogsAnterior - gastosAnterior - depAnterior - mermasAnterior;

    const anchorY = curEnd.getFullYear();
    const anchorM = curEnd.getMonth();

    const series6m: {
      monthKey: string;
      mesCorto: string;
      ingresos: number;
      gastos: number;
    }[] = [];

    for (let i = 11; i >= 0; i -= 1) {
      const d = new Date(anchorY, anchorM - i, 1);
      const yy = d.getFullYear();
      const mm = d.getMonth();
      const s = startOfMonth(yy, mm);
      const e = endOfMonth(yy, mm);
      const [iv, gv] = await Promise.all([
        prisma.venta.aggregate({
          where: { estado: 'ACTIVA', fecha: { gte: s, lte: e } },
          _sum: { total: true },
        }),
        prisma.gasto.aggregate({
          where: { fecha: { gte: s, lte: e } },
          _sum: { monto: true },
        }),
      ]);
      series6m.push({
        monthKey: `${yy}-${String(mm + 1).padStart(2, '0')}`,
        mesCorto: monthShortEs(yy, mm),
        ingresos: iv._sum.total ?? 0,
        gastos: gv._sum.monto ?? 0,
      });
    }

    /** Ingreso neto estimado por mes calendario (6 meses hasta el mes de «Hasta»); mismo criterio que el card principal. */
    const netoEstimadoUltimos6Meses = await Promise.all(
      [5, 4, 3, 2, 1, 0].map(async (monthsBack) => {
        const d = new Date(anchorY, anchorM - monthsBack, 1);
        const yy = d.getFullYear();
        const mm = d.getMonth();
        const s = startOfMonth(yy, mm);
        const e = endOfMonth(yy, mm);
        const [iv, gv, cogsV, mermV] = await Promise.all([
          prisma.venta.aggregate({
            where: { estado: 'ACTIVA', fecha: { gte: s, lte: e } },
            _sum: { total: true },
          }),
          prisma.gasto.aggregate({
            where: { fecha: { gte: s, lte: e } },
            _sum: { monto: true },
          }),
          sumCostoVentasPeriodo(prisma, s, e),
          sumCostoMermasPeriodo(prisma, s, e),
        ]);
        const ing = iv._sum.total ?? 0;
        const gas = gv._sum.monto ?? 0;
        const dep = depreciacionEstimadaEnPeriodo(deprecMensual, s, e);
        const net = ing - cogsV - gas - dep - mermV;
        return {
          monthKey: `${yy}-${String(mm + 1).padStart(2, '0')}`,
          mesCorto: monthShortEs(yy, mm),
          ingresoNeto: net,
        };
      }),
    );

    const metodoRows = await prisma.venta.groupBy({
      by: ['metodoPago'],
      where: { estado: 'ACTIVA', fecha: { gte: curStart, lte: curEnd } },
      _sum: { total: true },
    });

    const metodoPagoMes = metodoRows.map((r) => ({
      metodoPago: r.metodoPago,
      total: r._sum.total ?? 0,
    }));

    const ticketPromedioActual = venAct > 0 ? ingresosActual / venAct : 0;
    const ticketPromedioAnterior = venPrev > 0 ? ingresosAnterior / venPrev : 0;

    const rankLimit = 10;
    const grupos = await prisma.ventaDetalle.groupBy({
      by: ['productoId'],
      where: {
        venta: {
          estado: 'ACTIVA',
          fecha: { gte: curStart, lte: curEnd },
        },
      },
      _sum: { cantidad: true },
    });
    const withQty = grupos
      .map((g) => ({ productoId: g.productoId, cantidad: g._sum.cantidad ?? 0 }))
      .filter((x) => x.cantidad > 0)
      .sort((a, b) => b.cantidad - a.cantidad);

    const masIds = withQty.slice(0, rankLimit);
    const menosIds = [...withQty].sort((a, b) => a.cantidad - b.cantidad).slice(0, rankLimit);
    const rankIds = [...new Set([...masIds, ...menosIds].map((x) => x.productoId))];
    const productosRank =
      rankIds.length > 0
        ? await prisma.producto.findMany({
            where: { id: { in: rankIds } },
            select: { id: true, nombre: true, sku: true },
          })
        : [];
    const rankMap = new Map(productosRank.map((p) => [p.id, p]));

    const mapRank = (rows: { productoId: number; cantidad: number }[]) =>
      rows.map((r) => {
        const p = rankMap.get(r.productoId);
        return {
          productoId: r.productoId,
          nombre: p?.nombre ?? `Producto #${r.productoId}`,
          sku: p?.sku ?? '',
          cantidad: r.cantidad,
        };
      });

    const productosProximosCaducar = (
      await prisma.producto.findMany({
        where: {
          status: 'ACTIVE',
          stockActual: { gt: 0 },
        },
      })
    )
      .filter((p: any) => p.fechaCaducidad != null)
      .sort((a: any, b: any) => (a.fechaCaducidad?.getTime() ?? 0) - (b.fechaCaducidad?.getTime() ?? 0))
      .slice(0, 10);

    return {
      moneda: cfg?.moneda?.trim() || 'MXN',
      mesActualLabel: formatRangeLabelEs(curStart, curEnd),
      mesAnteriorLabel: formatRangeLabelEs(prevStart, prevEnd),
      ingresos: {
        actual: ingresosActual,
        anterior: ingresosAnterior,
        momPct: pctMom(ingresosActual, ingresosAnterior),
      },
      gastos: {
        actual: gastosActual,
        anterior: gastosAnterior,
        momPct: pctMom(gastosActual, gastosAnterior),
      },
      ventasCount: { actual: venAct, anterior: venPrev },
      ticketPromedio: {
        actual: ticketPromedioActual,
        anterior: ticketPromedioAnterior,
        momPct: pctMom(ticketPromedioActual, ticketPromedioAnterior),
      },
      balanceActual: ingresosActual - gastosActual,
      resumenNeto: {
        ingresoNeto: {
          actual: netActual,
          anterior: netAnterior,
          momPct: pctMom(netActual, netAnterior),
        },
        costoVentas: {
          actual: cogsActual,
          anterior: cogsAnterior,
          momPct: pctMom(cogsActual, cogsAnterior),
        },
        depreciacionEstimada: {
          actual: depActual,
          anterior: depAnterior,
          momPct: pctMom(depActual, depAnterior),
        },
        costoMermas: {
          actual: mermasActual,
          anterior: mermasAnterior,
          momPct: pctMom(mermasActual, mermasAnterior),
        },
        depreciacionMensual: deprecMensual,
      },
      series6m,
      netoEstimadoUltimos6Meses,
      metodoPagoMes,
      productosMasVendidos: mapRank(masIds),
      productosMenosVendidos: mapRank(menosIds),
      productosProximosCaducar: productosProximosCaducar.map((p) => ({
        productoId: p.id,
        nombre: p.nombre,
        sku: p.sku,
        stockActual: p.stockActual,
        fechaCaducidad: p.fechaCaducidad?.toISOString() ?? '',
      })),
    };
  });
}
