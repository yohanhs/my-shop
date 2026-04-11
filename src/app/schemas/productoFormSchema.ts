import * as yup from 'yup';

const statusSchema = yup
  .mixed<'ACTIVE' | 'INACTIVE'>()
  .oneOf(['ACTIVE', 'INACTIVE'] as const, 'Estado inválido.')
  .required('Selecciona un estado.');

export const productoFormSchema = yup.object({
  nombre: yup.string().trim().required('El nombre es obligatorio.'),
  sku: yup.string().trim().required('El SKU es obligatorio.'),
  descripcion: yup.string().max(2000, 'Máximo 2000 caracteres.').default(''),
  precioCosto: yup
    .number()
    .typeError('Precio de costo inválido.')
    .min(0, 'Debe ser mayor o igual a 0.')
    .required('Obligatorio.'),
  precioVenta: yup
    .number()
    .typeError('Precio de venta inválido.')
    .min(0, 'Debe ser mayor o igual a 0.')
    .required('Obligatorio.'),
  stockActual: yup
    .number()
    .typeError('Stock actual inválido.')
    .integer('Debe ser un número entero.')
    .min(0, 'Debe ser mayor o igual a 0.')
    .required('Obligatorio.'),
  stockMinimo: yup
    .number()
    .typeError('Stock mínimo inválido.')
    .integer('Debe ser un número entero.')
    .min(0, 'Debe ser mayor o igual a 0.')
    .required('Obligatorio.'),
  imagenPath: yup.string().default(''),
  /** Vacío = sin caducidad; si hay texto debe ser fecha válida (controlada en el picker). */
  fechaCaducidad: yup.string().trim().default(''),
  status: statusSchema,
});

export type ProductoFormValues = yup.InferType<typeof productoFormSchema>;

export const productoFormDefaultValues: ProductoFormValues = {
  nombre: '',
  sku: '',
  descripcion: '',
  precioCosto: 0,
  precioVenta: 0,
  stockActual: 0,
  stockMinimo: 0,
  imagenPath: '',
  fechaCaducidad: '',
  status: 'ACTIVE',
};
