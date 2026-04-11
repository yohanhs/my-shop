import * as yup from 'yup';

import type { VentaConDetalles, VentaCreateInput, VentaMetodoPago } from '@/types/electron';

const METODOS_VENTA = ['EFECTIVO', 'TARJETA', 'TRANSFERENCIA'] as const satisfies readonly VentaMetodoPago[];

const lineaSchema = yup.object({
  productoId: yup
    .number()
    .integer('Producto inválido.')
    .typeError('Producto inválido.')
    .min(1, 'Elige un producto.')
    .required(),
  cantidad: yup
    .number()
    .integer('La cantidad debe ser entera.')
    .typeError('Cantidad inválida.')
    .min(1, 'Mínimo 1.')
    .required(),
});

export const ventaFormSchema = yup.object({
  metodoPago: yup
    .mixed<VentaMetodoPago>()
    .oneOf(['EFECTIVO', 'TARJETA', 'TRANSFERENCIA'] as const, 'Método de pago inválido.')
    .required('Selecciona método de pago.'),
  ticketFolio: yup.string().trim().max(80, 'Máximo 80 caracteres.').default(''),
  lineas: yup
    .array()
    .of(lineaSchema)
    .min(1, 'Agrega al menos un producto.')
    .required('Agrega al menos un producto.'),
});

/** Tipado explícito: InferType de Yup marca `lineas` como opcional y rompe react-hook-form. */
export interface VentaFormValues {
  metodoPago: VentaMetodoPago;
  ticketFolio: string;
  lineas: { productoId: number; cantidad: number }[];
}

export const ventaFormDefaultValues: VentaFormValues = {
  metodoPago: 'EFECTIVO',
  ticketFolio: '',
  lineas: [{ productoId: 0, cantidad: 1 }],
};

export function ventaConDetallesToFormValues(v: VentaConDetalles): VentaFormValues {
  const raw = String(v.metodoPago ?? '').toUpperCase();
  const metodoPago = (METODOS_VENTA as readonly string[]).includes(raw)
    ? (raw as VentaMetodoPago)
    : 'EFECTIVO';
  return {
    metodoPago,
    ticketFolio: v.ticketFolio ?? '',
    lineas:
      v.detalles.length > 0
        ? v.detalles.map((d) => ({ productoId: d.productoId, cantidad: d.cantidad }))
        : [{ productoId: 0, cantidad: 1 }],
  };
}

export function ventaFormToCreate(values: VentaFormValues): VentaCreateInput {
  const folio = values.ticketFolio.trim();
  const lineas = values.lineas;
  return {
    metodoPago: values.metodoPago,
    ticketFolio: folio.length === 0 ? null : folio,
    lineas: lineas.map((l) => ({
      productoId: l.productoId,
      cantidad: l.cantidad,
    })),
  };
}
