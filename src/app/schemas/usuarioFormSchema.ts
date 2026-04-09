import * as yup from 'yup';

const statusSchema = yup
  .mixed<'ACTIVE' | 'INACTIVE'>()
  .oneOf(['ACTIVE', 'INACTIVE'] as const, 'Estado inválido.')
  .required('Selecciona un estado.');

export const usuarioCreateFormSchema = yup.object({
  nombre: yup.string().trim().required('El nombre es obligatorio.').max(120, 'Máximo 120 caracteres.'),
  username: yup
    .string()
    .trim()
    .required('El usuario es obligatorio.')
    .min(3, 'Mínimo 3 caracteres.')
    .max(64, 'Máximo 64 caracteres.')
    .matches(/^[a-zA-Z0-9._-]+$/, 'Solo letras, números, punto, guion y guion bajo.'),
  password: yup
    .string()
    .required('La contraseña es obligatoria.')
    .min(6, 'Mínimo 6 caracteres.')
    .max(128, 'Máximo 128 caracteres.'),
  rolId: yup
    .number()
    .typeError('Elige un rol.')
    .integer('Rol inválido.')
    .min(1, 'Elige un rol.')
    .required('Elige un rol.'),
});

export type UsuarioCreateFormValues = yup.InferType<typeof usuarioCreateFormSchema>;

export const usuarioCreateFormDefaultValues: UsuarioCreateFormValues = {
  nombre: '',
  username: '',
  password: '',
  rolId: 0,
};

export const usuarioEditFormSchema = yup.object({
  nombre: yup.string().trim().required('El nombre es obligatorio.').max(120, 'Máximo 120 caracteres.'),
  username: yup
    .string()
    .trim()
    .required('El usuario es obligatorio.')
    .min(3, 'Mínimo 3 caracteres.')
    .max(64, 'Máximo 64 caracteres.')
    .matches(/^[a-zA-Z0-9._-]+$/, 'Solo letras, números, punto, guion y guion bajo.'),
  password: yup
    .string()
    .max(128, 'Máximo 128 caracteres.')
    .default('')
    .test(
      'password-length-if-set',
      'Mínimo 6 caracteres si cambias la contraseña.',
      (v) => v === '' || v.length >= 6,
    ),
  rolId: yup
    .number()
    .typeError('Elige un rol.')
    .integer('Rol inválido.')
    .min(1, 'Elige un rol.')
    .required('Elige un rol.'),
  status: statusSchema,
});

export type UsuarioEditFormValues = yup.InferType<typeof usuarioEditFormSchema>;

export const usuarioEditFormDefaultValues: UsuarioEditFormValues = {
  nombre: '',
  username: '',
  password: '',
  rolId: 0,
  status: 'ACTIVE',
};
