import type { Prisma, Producto } from '@prisma/client';
import { ipcMain } from 'electron';
import { assertAuthenticated, getAuthSession } from '../auth/sessionStore';
import { getPrismaClient } from '../db/client';
import { buildVentaWhere, type VentaListPagedOpts } from './ventaListWhere';

const VENTA_CHANNELS = [
  'venta:listPaged',
  'venta:getById',
  'venta:create',
  'venta:update',
  'venta:anular',
] as const;

const METODOS = new Set(['EFECTIVO', 'TARJETA', 'TRANSFERENCIA']);

type LineaInput = { productoId: number; cantidad: number };

function mergeLineas(lineas: LineaInput[]): LineaInput[] {
  const map = new Map<number, number>();
  for (const l of lineas) {
    const pid = Math.floor(Number(l.productoId));
    const q = Math.floor(Number(l.cantidad));
    if (!Number.isFinite(pid) || pid < 1 || !Number.isFinite(q) || q < 1) continue;
    map.set(pid, (map.get(pid) ?? 0) + q);
  }
  return Array.from(map.entries()).map(([productoId, cantidad]) => ({ productoId, cantidad }));
}

type VentaDetalleRow = {
  id: number;
  productoId: number;
  cantidad: number;
  precioAplicado: number;
  precioCostoUnitarioHistorico: number;
  producto: { nombre: string; sku: string };
};

type VentaWithDetallesRow = {
  id: number;
  fecha: Date;
  total: number;
  metodoPago: string;
  estado: string;
  ticketFolio: string | null;
  createdAt: Date;
  updatedAt: Date;
  detalles: VentaDetalleRow[];
};

function toVentaApiPayload(v: VentaWithDetallesRow) {
  return {
    id: v.id,
    fecha: v.fecha.toISOString(),
    total: v.total,
    metodoPago: v.metodoPago,
    estado: v.estado,
    ticketFolio: v.ticketFolio,
    createdAt: v.createdAt.toISOString(),
    updatedAt: v.updatedAt.toISOString(),
    detalles: v.detalles.map((d) => ({
      id: d.id,
      productoId: d.productoId,
      cantidad: d.cantidad,
      precioAplicado: d.precioAplicado,
      precioCostoUnitarioHistorico: d.precioCostoUnitarioHistorico,
      productoNombre: d.producto.nombre,
      productoSku: d.producto.sku,
    })),
  };
}

function parseMetodoPago(raw: string): string {
  const metodoPago = typeof raw === 'string' ? raw.trim().toUpperCase() : '';
  if (!METODOS.has(metodoPago)) {
    throw new Error('Método de pago inválido.');
  }
  return metodoPago;
}

function parseTicketFolio(payload: { ticketFolio?: string | null }): string | null {
  const folioRaw =
    payload.ticketFolio === undefined || payload.ticketFolio === null
      ? ''
      : String(payload.ticketFolio).trim();
  return folioRaw.length === 0 ? null : folioRaw;
}

/** Folio por defecto al imprimir o mostrar en ticket (coincide con el id interno de forma legible). */
function defaultTicketFolio(ventaId: number): string {
  return `V-${ventaId}`;
}

/** Cliente de transacción Prisma (tipado laxo para evitar dependencia de versión). */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type TxClient = any;

async function resolveUsuarioId(tx: TxClient, explicit?: number): Promise<number> {
  const session = getAuthSession();
  if (session?.rolNombre === 'Cajero') {
    const ex = explicit != null ? Math.floor(Number(explicit)) : null;
    if (ex != null && ex > 0 && ex !== session.usuarioId) {
      throw new Error('No puedes registrar ventas a nombre de otro usuario.');
    }
    const self = await tx.usuario.findFirst({
      where: { id: session.usuarioId, status: 'ACTIVE' },
    });
    if (!self) {
      throw new Error('Tu usuario no está activo; no se puede registrar la venta.');
    }
    return self.id;
  }

  if (explicit != null && explicit > 0) {
    const u = await tx.usuario.findFirst({
      where: { id: Math.floor(explicit), status: 'ACTIVE' },
    });
    if (u) return u.id;
  }
  if (session?.usuarioId) {
    const self = await tx.usuario.findFirst({
      where: { id: session.usuarioId, status: 'ACTIVE' },
    });
    if (self) return self.id;
  }
  const first = await tx.usuario.findFirst({
    where: { status: 'ACTIVE' },
    orderBy: { id: 'asc' },
  });
  if (!first) {
    throw new Error('No hay usuarios activos; no se puede registrar la venta ni el movimiento de stock.');
  }
  return first.id;
}

function mergeVentaWhereForCajero(
  where: Prisma.VentaWhereInput,
  rolNombre: string | undefined,
  usuarioId: number | undefined,
): Prisma.VentaWhereInput {
  if (rolNombre !== 'Cajero' || usuarioId == null) return where;
  const scope: Prisma.VentaWhereInput = { usuarioId };
  if (!where || Object.keys(where).length === 0) return scope;
  return { AND: [where, scope] };
}

async function assertCajeroOwnsVentaTx(tx: TxClient, ventaId: number): Promise<void> {
  const snap = getAuthSession();
  if (!snap || snap.rolNombre !== 'Cajero') return;
  const v = await tx.venta.findUnique({
    where: { id: ventaId },
    select: { usuarioId: true },
  });
  if (!v || v.usuarioId == null || v.usuarioId !== snap.usuarioId) {
    throw new Error('No autorizado.');
  }
}

export function registerVentaIpc(): void {
  const prisma = getPrismaClient();

  for (const ch of VENTA_CHANNELS) {
    ipcMain.removeHandler(ch);
  }

  ipcMain.handle('venta:listPaged', async (_event, opts: VentaListPagedOpts) => {
    assertAuthenticated();
    const snap = getAuthSession();
    const page = Math.max(1, Math.floor(Number(opts?.page) || 1));
    const rawSize = Math.floor(Number(opts?.pageSize) || 10);
    const pageSize = Math.min(100, Math.max(1, rawSize));
    const skip = (page - 1) * pageSize;
    const where = mergeVentaWhereForCajero(buildVentaWhere(opts), snap?.rolNombre, snap?.usuarioId);

    const [rows, total] = await Promise.all([
      prisma.venta.findMany({
        where,
        orderBy: { fecha: 'desc' },
        skip,
        take: pageSize,
        include: {
          _count: { select: { detalles: true } },
        },
      }),
      prisma.venta.count({ where }),
    ]);

    const items = rows.map((v) => ({
      id: v.id,
      fecha: v.fecha.toISOString(),
      total: v.total,
      metodoPago: v.metodoPago,
      estado: v.estado,
      ticketFolio: v.ticketFolio,
      createdAt: v.createdAt.toISOString(),
      lineasCount: v._count.detalles,
    }));

    return { items, total, page, pageSize };
  });

  ipcMain.handle('venta:getById', async (_event, id: number) => {
    assertAuthenticated();
    const snap = getAuthSession();
    const v = await prisma.venta.findUnique({
      where: { id },
      include: {
        detalles: {
          include: {
            producto: { select: { id: true, nombre: true, sku: true } },
          },
          orderBy: { id: 'asc' },
        },
      },
    });
    if (!v) return null;
    if (
      snap?.rolNombre === 'Cajero' &&
      (v.usuarioId == null || v.usuarioId !== snap.usuarioId)
    ) {
      return null;
    }

    return {
      id: v.id,
      fecha: v.fecha.toISOString(),
      total: v.total,
      metodoPago: v.metodoPago,
      estado: v.estado,
      ticketFolio: v.ticketFolio,
      createdAt: v.createdAt.toISOString(),
      updatedAt: v.updatedAt.toISOString(),
      detalles: v.detalles.map((d) => ({
        id: d.id,
        productoId: d.productoId,
        cantidad: d.cantidad,
        precioAplicado: d.precioAplicado,
        precioCostoUnitarioHistorico: d.precioCostoUnitarioHistorico,
        productoNombre: d.producto.nombre,
        productoSku: d.producto.sku,
      })),
    };
  });

  ipcMain.handle(
    'venta:create',
    async (
      _event,
      payload: {
        metodoPago: string;
        ticketFolio?: string | null;
        lineas: LineaInput[];
        usuarioId?: number;
      },
    ) => {
      assertAuthenticated();
      const metodoPago = typeof payload.metodoPago === 'string' ? payload.metodoPago.trim().toUpperCase() : '';
      if (!METODOS.has(metodoPago)) {
        throw new Error('Método de pago inválido.');
      }

      const merged = mergeLineas(payload.lineas ?? []);
      if (merged.length === 0) {
        throw new Error('Agrega al menos un producto con cantidad.');
      }

      const folioRaw =
        payload.ticketFolio === undefined || payload.ticketFolio === null
          ? ''
          : String(payload.ticketFolio).trim();
      const ticketFolio = folioRaw.length === 0 ? null : folioRaw;

      const result = await prisma.$transaction(async (tx: TxClient) => {
        const usuarioId = await resolveUsuarioId(tx, payload.usuarioId);

        const productos: Producto[] = await tx.producto.findMany({
          where: { id: { in: merged.map((m) => m.productoId) } },
        });

        if (productos.length !== merged.length) {
          throw new Error('Uno o más productos no existen.');
        }

        for (const p of productos) {
          if (p.status !== 'ACTIVE') {
            throw new Error(`El producto «${p.nombre}» está inactivo.`);
          }
          const line = merged.find((l) => l.productoId === p.id)!;
          if (p.stockActual < line.cantidad) {
            throw new Error(`Stock insuficiente para «${p.nombre}» (disponible: ${p.stockActual}).`);
          }
        }

        const total = merged.reduce((sum, l) => {
          const p = productos.find((x) => x.id === l.productoId)!;
          return sum + l.cantidad * p.precioVenta;
        }, 0);

        let venta = await tx.venta.create({
          data: {
            total,
            metodoPago,
            estado: 'ACTIVA',
            ticketFolio,
            usuarioId,
            detalles: {
              create: merged.map((l) => {
                const p = productos.find((x) => x.id === l.productoId)!;
                return {
                  productoId: p.id,
                  cantidad: l.cantidad,
                  precioAplicado: p.precioVenta,
                  precioCostoUnitarioHistorico: p.precioCosto,
                };
              }),
            },
          },
          include: {
            detalles: {
              include: {
                producto: { select: { id: true, nombre: true, sku: true } },
              },
              orderBy: { id: 'asc' },
            },
          },
        });

        if (venta.ticketFolio == null) {
          venta = await tx.venta.update({
            where: { id: venta.id },
            data: { ticketFolio: defaultTicketFolio(venta.id) },
            include: {
              detalles: {
                include: {
                  producto: { select: { id: true, nombre: true, sku: true } },
                },
                orderBy: { id: 'asc' },
              },
            },
          });
        }

        for (const l of merged) {
          await tx.producto.update({
            where: { id: l.productoId },
            data: { stockActual: { decrement: l.cantidad } },
          });
          await tx.movimientoStock.create({
            data: {
              productoId: l.productoId,
              tipo: 'SALIDA',
              cantidad: l.cantidad,
              motivo: 'VENTA',
              usuarioId,
              proveedorId: null,
            },
          });
        }

        return venta;
      });

      return toVentaApiPayload(result as VentaWithDetallesRow);
    },
  );

  ipcMain.handle(
    'venta:update',
    async (
      _event,
      ventaIdParam: number,
      payload: {
        metodoPago: string;
        ticketFolio?: string | null;
        lineas: LineaInput[];
        usuarioId?: number;
      },
    ) => {
      assertAuthenticated();
      const ventaId = Math.floor(Number(ventaIdParam));
      if (!Number.isFinite(ventaId) || ventaId < 1) {
        throw new Error('Venta inválida.');
      }

      const metodoPago = parseMetodoPago(payload.metodoPago);
      const ticketFolio = parseTicketFolio(payload);

      const merged = mergeLineas(payload.lineas ?? []);
      if (merged.length === 0) {
        throw new Error('Agrega al menos un producto con cantidad.');
      }

      const updated = await prisma.$transaction(async (tx: TxClient) => {
        const v = await tx.venta.findUnique({
          where: { id: ventaId },
          include: { detalles: true },
        });
        if (!v) {
          throw new Error('Venta no encontrada.');
        }
        if (v.estado !== 'ACTIVA') {
          throw new Error('Solo se pueden editar ventas activas.');
        }

        await assertCajeroOwnsVentaTx(tx, ventaId);

        const usuarioId = await resolveUsuarioId(tx, payload.usuarioId);

        for (const d of v.detalles) {
          await tx.producto.update({
            where: { id: d.productoId },
            data: { stockActual: { increment: d.cantidad } },
          });
          await tx.movimientoStock.create({
            data: {
              productoId: d.productoId,
              tipo: 'ENTRADA',
              cantidad: d.cantidad,
              motivo: 'AJUSTE',
              usuarioId,
              proveedorId: null,
            },
          });
        }

        await tx.ventaDetalle.deleteMany({ where: { ventaId } });

        const productos: Producto[] = await tx.producto.findMany({
          where: { id: { in: merged.map((m) => m.productoId) } },
        });

        if (productos.length !== merged.length) {
          throw new Error('Uno o más productos no existen.');
        }

        for (const p of productos) {
          if (p.status !== 'ACTIVE') {
            throw new Error(`El producto «${p.nombre}» está inactivo.`);
          }
          const line = merged.find((l) => l.productoId === p.id)!;
          if (p.stockActual < line.cantidad) {
            throw new Error(`Stock insuficiente para «${p.nombre}» (disponible: ${p.stockActual}).`);
          }
        }

        const total = merged.reduce((sum, l) => {
          const p = productos.find((x) => x.id === l.productoId)!;
          return sum + l.cantidad * p.precioVenta;
        }, 0);

        const folioGuardado = ticketFolio ?? defaultTicketFolio(ventaId);

        await tx.venta.update({
          where: { id: ventaId },
          data: { total, metodoPago, ticketFolio: folioGuardado },
        });

        await tx.ventaDetalle.createMany({
          data: merged.map((l) => {
            const p = productos.find((x) => x.id === l.productoId)!;
            return {
              ventaId,
              productoId: p.id,
              cantidad: l.cantidad,
              precioAplicado: p.precioVenta,
              precioCostoUnitarioHistorico: p.precioCosto,
            };
          }),
        });

        for (const l of merged) {
          await tx.producto.update({
            where: { id: l.productoId },
            data: { stockActual: { decrement: l.cantidad } },
          });
          await tx.movimientoStock.create({
            data: {
              productoId: l.productoId,
              tipo: 'SALIDA',
              cantidad: l.cantidad,
              motivo: 'VENTA',
              usuarioId,
              proveedorId: null,
            },
          });
        }

        const full = await tx.venta.findUnique({
          where: { id: ventaId },
          include: {
            detalles: {
              include: {
                producto: { select: { id: true, nombre: true, sku: true } },
              },
              orderBy: { id: 'asc' },
            },
          },
        });
        if (!full) {
          throw new Error('Venta no encontrada tras actualizar.');
        }
        return full;
      });

      return toVentaApiPayload(updated as VentaWithDetallesRow);
    },
  );

  ipcMain.handle('venta:anular', async (_event, id: number, usuarioIdOpt?: number) => {
    assertAuthenticated();
    await prisma.$transaction(async (tx: TxClient) => {
      const v = await tx.venta.findUnique({
        where: { id },
        include: { detalles: true },
      });
      if (!v) {
        throw new Error('Venta no encontrada.');
      }
      if (v.estado !== 'ACTIVA') {
        throw new Error('La venta ya está anulada.');
      }

      await assertCajeroOwnsVentaTx(tx, id);

      const usuarioId = await resolveUsuarioId(tx, usuarioIdOpt);

      for (const d of v.detalles) {
        await tx.producto.update({
          where: { id: d.productoId },
          data: { stockActual: { increment: d.cantidad } },
        });
        await tx.movimientoStock.create({
          data: {
            productoId: d.productoId,
            tipo: 'ENTRADA',
            cantidad: d.cantidad,
            motivo: 'AJUSTE',
            usuarioId,
            proveedorId: null,
          },
        });
      }

      await tx.venta.update({
        where: { id },
        data: { estado: 'ANULADA' },
      });
    });

    return { ok: true };
  });
}
