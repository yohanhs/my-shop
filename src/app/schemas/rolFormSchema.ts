import * as yup from 'yup';

export const rolFormSchema = yup.object({
  nombre: yup
    .string()
    .trim()
    .required('El nombre del rol es obligatorio.')
    .min(2, 'Mínimo 2 caracteres.')
    .max(80, 'Máximo 80 caracteres.'),
});

export type RolFormValues = yup.InferType<typeof rolFormSchema>;

export const rolFormDefaultValues: RolFormValues = {
  nombre: '',
};
