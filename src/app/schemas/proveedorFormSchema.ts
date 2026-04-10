import * as yup from 'yup';

import type { ProveedorInput, ProveedorUpdateInput } from '@/types/electron';

const optionalText = (max: number) =>
  yup.string().trim().max(max, `Máximo ${max} caracteres.`).default('');

export const proveedorFormSchema = yup.object({
  nombre: yup.string().trim().required('El nombre es obligatorio.').max(160, 'Máximo 160 caracteres.'),
  telefono: optionalText(40),
  empresa: optionalText(160),
  direccion: optionalText(500),
  email: yup
    .string()
    .trim()
    .max(120, 'Máximo 120 caracteres.')
    .default('')
    .test('email-if-set', 'Email inválido.', (v) => {
      if (!v || v.length === 0) return true;
      return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
    }),
});

export type ProveedorFormValues = yup.InferType<typeof proveedorFormSchema>;

export const proveedorFormDefaultValues: ProveedorFormValues = {
  nombre: '',
  telefono: '',
  empresa: '',
  direccion: '',
  email: '',
};

function toNullIfEmpty(s: string): string | null {
  const t = s.trim();
  return t.length === 0 ? null : t;
}

export function proveedorFormToInput(values: ProveedorFormValues): ProveedorInput {
  return {
    nombre: values.nombre.trim(),
    telefono: toNullIfEmpty(values.telefono ?? ''),
    empresa: toNullIfEmpty(values.empresa ?? ''),
    direccion: toNullIfEmpty(values.direccion ?? ''),
    email: toNullIfEmpty(values.email ?? ''),
  };
}

export function proveedorFormToUpdate(values: ProveedorFormValues): ProveedorUpdateInput {
  return proveedorFormToInput(values);
}
