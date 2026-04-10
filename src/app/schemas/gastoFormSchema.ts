import { format } from 'date-fns';
import * as yup from 'yup';

import type { Gasto, GastoInput, GastoUpdateInput } from '@/types/electron';

const YMD_RE = /^\d{4}-\d{2}-\d{2}$/;

export const gastoFormSchema = yup.object({
  concepto: yup
    .string()
    .trim()
    .required('El concepto es obligatorio.')
    .max(500, 'Máximo 500 caracteres.'),
  monto: yup
    .number()
    .typeError('Monto inválido.')
    .positive('El monto debe ser mayor que cero.')
    .required('Indica el monto.'),
  fecha: yup
    .string()
    .trim()
    .required('Elige la fecha.')
    .matches(YMD_RE, 'Fecha inválida (usa AAAA-MM-DD).'),
  categoria: yup
    .string()
    .trim()
    .required('La categoría es obligatoria.')
    .max(120, 'Máximo 120 caracteres.'),
});

export interface GastoFormValues {
  concepto: string;
  monto: number;
  fecha: string;
  categoria: string;
}

export function gastoFormDefaultValues(fechaYmd: string): GastoFormValues {
  return {
    concepto: '',
    monto: 0,
    fecha: fechaYmd,
    categoria: '',
  };
}

export function gastoToFormValues(g: Gasto): GastoFormValues {
  const d = new Date(g.fecha);
  const fecha = Number.isNaN(d.getTime()) ? format(new Date(), 'yyyy-MM-dd') : format(d, 'yyyy-MM-dd');
  return {
    concepto: g.concepto,
    monto: g.monto,
    fecha,
    categoria: g.categoria,
  };
}

export function gastoFormToInput(values: GastoFormValues): GastoInput {
  return {
    concepto: values.concepto,
    monto: values.monto,
    fecha: values.fecha,
    categoria: values.categoria,
  };
}

export function gastoFormToUpdate(values: GastoFormValues): GastoUpdateInput {
  return {
    concepto: values.concepto,
    monto: values.monto,
    fecha: values.fecha,
    categoria: values.categoria,
  };
}
