import * as yup from 'yup';

export const mermaFormSchema = yup.object({
  productoId: yup
    .number()
    .typeError('Elige un producto.')
    .integer('Producto inválido.')
    .min(1, 'Elige un producto.')
    .required('Obligatorio.'),
  cantidad: yup
    .number()
    .typeError('Indica una cantidad válida.')
    .integer('Usa un número entero.')
    .min(1, 'Mínimo 1 unidad.')
    .required('Obligatorio.'),
  fecha: yup.string().trim().default(''),
});

export type MermaFormValues = yup.InferType<typeof mermaFormSchema>;

export function mermaFormDefaultValues(fechaYmd: string): MermaFormValues {
  return {
    productoId: 0,
    cantidad: 1,
    fecha: fechaYmd,
  };
}
