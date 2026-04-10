import * as yup from 'yup';

export const configuracionFormSchema = yup.object({
  nombreTienda: yup
    .string()
    .trim()
    .required('El nombre de la tienda es obligatorio.')
    .max(120, 'Máximo 120 caracteres.'),
  moneda: yup
    .string()
    .trim()
    .required('Selecciona o indica una moneda.')
    .max(8, 'Máximo 8 caracteres.')
    .matches(/^[A-Za-z]{3,8}$/, 'Usa un código de moneda válido (ej. MXN, USD).')
    .transform((s) => s.toUpperCase()),
  impuestoPorcentaje: yup
    .number()
    .typeError('Indica un porcentaje válido.')
    .min(0, 'No puede ser negativo.')
    .max(100, 'No puede superar 100%.')
    .required('Obligatorio.'),
  logoPath: yup.string().trim().max(500, 'Máximo 500 caracteres.').default(''),
});

export type ConfiguracionFormValues = yup.InferType<typeof configuracionFormSchema>;

export const configuracionFormDefaults: ConfiguracionFormValues = {
  nombreTienda: '',
  moneda: 'MXN',
  impuestoPorcentaje: 16,
  logoPath: '',
};
