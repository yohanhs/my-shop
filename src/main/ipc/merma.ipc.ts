import { ipcMain } from 'electron';

import { assertAuthenticated, assertNotCajero } from '../auth/sessionStore';
import { getPrismaClient } from '../db/client';
import { buildMermaWhere, type MermaListPagedOpts } from './mermaListWhere';

const MERMA_CHANNELS = ['merma:registrar', 'merma:listPaged'] as const;

const DATE_YMD_RE = /^\d{4}-\d{2}-\d{2}$/;

function parseMermaFecha(raw: unknown): Date {
  if (raw === undefined || raw === null || raw === '') {
    return new Date();
  }
  const s = String(raw).trim();
  if (DATE_YMD_RE.test(s)) {
    const [y, m, d] = s.split('-').map((x) => Number(x));
    return new Date(y, m - 1, d, 12, 0, 0, 0);
  }
  const t = new Date(s);
  if (Number.isNaN(t.getTime())) {
    return new Date();
  }
  return t;
}

function toRegistroDto(m: { id: number; fecha: Date; cantidad: number; productoId: number }, stockActual: number) {
  return {
    id: m.id,
    fecha: m.fecha.toISOString(),
    cantidad: m.cantidad,
    productoId: m.productoId,
    stockActual,
  };
}

export function registerMermaIpc(): void {
  const prisma = getPrismaClient();

  for (const ch of MERMA_CHANNELS) {
    ipcMain.removeHandler(ch);
  }

  ipcMain.handle(
    'merma:registrar',
    async (
      _event,
      data: {
        productoId: number;
        cantidad: number;
        fecha?: string | null;
      },
    ) => {
      assertNotCajero();
      const session = assertAuthenticated();
      const usuarioId = session.usuarioId;

      const productoId = Math.floor(Number(data?.productoId));
      if (!Number.isFinite(productoId) || productoId < 1) {
        throw new Error('Producto inválido.');
      }
      const cantidad = Math.floor(Number(data?.cantidad));
      if (!Number.isFinite(cantidad) || cantidad < 1) {
        throw new Error('La cantidad debe ser un entero mayor o igual a 1.');
      }

      const fechaRegistro = parseMermaFecha(data?.fecha);

      const result = await prisma.$transaction(async (tx) => {
        const p = await tx.producto.findUnique({ where: { id: productoId } });
        if (!p) {
          throw new Error('Producto no encontrado.');
        }
        if (p.status !== 'ACTIVE') {
          throw new Error('El producto está inactivo; no se puede registrar merma.');
        }
        if (p.stockActual < cantidad) {
          throw new Error(`Stock insuficiente (disponible: ${p.stockActual}).`);
        }

        await tx.producto.update({
          where: { id: productoId },
          data: { stockActual: { decrement: cantidad } },
        });

        const mov = await tx.movimientoStock.create({
          data: {
            productoId,
            tipo: 'SALIDA',
            cantidad,
            motivo: 'MERMA',
            fecha: fechaRegistro,
            usuarioId,
            proveedorId: null,
          },
        });

        const updated = await tx.producto.findUnique({
          where: { id: productoId },
          select: { stockActual: true },
        });

        return { mov, stockActual: updated?.stockActual ?? 0 };
      });

      return toRegistroDto(result.mov, result.stockActual);
    },
  );

  ipcMain.handle('merma:listPaged', async (_event, opts: MermaListPagedOpts) => {
    assertNotCajero();
    const page = Math.max(1, Math.floor(Number(opts?.page) || 1));
    const rawSize = Math.floor(Number(opts?.pageSize) || 10);
    const pageSize = Math.min(100, Math.max(1, rawSize));
    const skip = (page - 1) * pageSize;
    const where = buildMermaWhere(opts ?? {});

    const [rows, total] = await Promise.all([
      prisma.movimientoStock.findMany({
        where,
        orderBy: [{ fecha: 'desc' }, { id: 'desc' }],
        skip,
        take: pageSize,
        include: {
          producto: { select: { id: true, nombre: true, sku: true, precioCosto: true } },
          usuario: { select: { id: true, nombre: true } },
        },
      }),
      prisma.movimientoStock.count({ where }),
    ]);

    const items = rows.map((r) => ({
      id: r.id,
      fecha: r.fecha.toISOString(),
      cantidad: r.cantidad,
      productoId: r.productoId,
      productoNombre: r.producto.nombre,
      productoSku: r.producto.sku,
      usuarioNombre: r.usuario.nombre,
      /** cantidad × costo actual del producto (referencia al consultar; no es histórico guardado). */
      costoReferencia: r.cantidad * r.producto.precioCosto,
    }));

    return { items, total, page, pageSize };
  });
}
