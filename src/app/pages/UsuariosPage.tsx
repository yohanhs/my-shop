import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';

import { UsuariosFiltersBar } from '@/components/usuarios/UsuariosFiltersBar';
import { UsuariosTable } from '@/components/usuarios/UsuariosTable';
import { TablePagination } from '@/components/ui/table-pagination';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  usuarioCreateFormDefaultValues,
  usuarioCreateFormSchema,
  usuarioEditFormDefaultValues,
  usuarioEditFormSchema,
  type UsuarioCreateFormValues,
  type UsuarioEditFormValues,
} from '@/schemas/usuarioFormSchema';
import type { Rol, Usuario, UsuarioInput, UsuarioUpdateInput } from '@/types/electron';
import { useUsuarioStore } from '@/store/useUsuarioStore';

function useRolesForModal(open: boolean): Rol[] {
  const [rolesOpts, setRolesOpts] = useState<Rol[]>([]);
  useEffect(() => {
    if (!open) return;
    const api = typeof window !== 'undefined' ? window.api?.rol : undefined;
    if (!api) {
      setRolesOpts([]);
      return;
    }
    void api.listAll().then(setRolesOpts).catch(() => setRolesOpts([]));
  }, [open]);
  return rolesOpts;
}

interface UsuarioCreateModalProps {
  open: boolean;
  onClose: () => void;
  onSubmitCreate: (data: UsuarioInput) => Promise<boolean>;
}

function UsuarioCreateModal({ open, onClose, onSubmitCreate }: UsuarioCreateModalProps) {
  const [serverError, setServerError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const rolesOpts = useRolesForModal(open);

  const form = useForm<UsuarioCreateFormValues>({
    resolver: yupResolver(usuarioCreateFormSchema),
    defaultValues: usuarioCreateFormDefaultValues,
    mode: 'onTouched',
  });

  useEffect(() => {
    if (!open) return;
    setServerError(null);
    form.reset(usuarioCreateFormDefaultValues);
  }, [open, form]);

  const onSubmit = async (values: UsuarioCreateFormValues) => {
    setServerError(null);
    setSubmitting(true);
    try {
      const ok = await onSubmitCreate({
        nombre: values.nombre.trim(),
        username: values.username.trim(),
        password: values.password,
        rolId: values.rolId,
      });
      if (ok) {
        onClose();
      } else {
        const msg = useUsuarioStore.getState().error;
        setServerError(msg && msg.length > 0 ? msg : 'No se pudo guardar.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next && !submitting) onClose();
      }}
    >
      <DialogContent
        className="max-h-[90vh] overflow-y-auto sm:max-w-lg"
        onInteractOutside={(e) => submitting && e.preventDefault()}
        onEscapeKeyDown={(e) => submitting && e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>Nuevo usuario</DialogTitle>
          <DialogDescription>Define nombre, usuario de acceso, contraseña y rol.</DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {serverError && (
              <Alert variant="destructive">
                <AlertDescription>{serverError}</AlertDescription>
              </Alert>
            )}

            <FormField
              control={form.control}
              name="nombre"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nombre completo</FormLabel>
                  <FormControl>
                    <Input placeholder="Nombre y apellido" disabled={submitting} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="username"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Usuario (login)</FormLabel>
                  <FormControl>
                    <Input
                      className="font-mono"
                      placeholder="admin"
                      autoComplete="username"
                      disabled={submitting}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Contraseña</FormLabel>
                  <FormControl>
                    <Input
                      type="password"
                      autoComplete="new-password"
                      placeholder="••••••••"
                      disabled={submitting}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="rolId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Rol</FormLabel>
                  <Select
                    disabled={submitting || rolesOpts.length === 0}
                    value={field.value > 0 ? String(field.value) : ''}
                    onValueChange={(v) => field.onChange(Number(v))}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue
                          placeholder={rolesOpts.length === 0 ? 'Cargando roles…' : 'Selecciona un rol'}
                        />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {rolesOpts.map((r) => (
                        <SelectItem key={r.id} value={String(r.id)}>
                          {r.nombre}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter className="gap-2 sm:gap-0">
              <Button type="button" variant="outline" disabled={submitting} onClick={onClose}>
                Cancelar
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? 'Guardando…' : 'Guardar'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

interface UsuarioEditModalProps {
  open: boolean;
  usuario: Usuario;
  onClose: () => void;
  onSubmitUpdate: (id: number, data: UsuarioUpdateInput) => Promise<boolean>;
}

function UsuarioEditModal({ open, usuario, onClose, onSubmitUpdate }: UsuarioEditModalProps) {
  const [serverError, setServerError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const rolesOpts = useRolesForModal(open);

  const form = useForm<UsuarioEditFormValues>({
    resolver: yupResolver(usuarioEditFormSchema),
    defaultValues: usuarioEditFormDefaultValues,
    mode: 'onTouched',
  });

  useEffect(() => {
    if (!open) return;
    setServerError(null);
    form.reset({
      nombre: usuario.nombre,
      username: usuario.username,
      password: '',
      rolId: usuario.rolId,
      status: usuario.status === 'INACTIVE' ? 'INACTIVE' : 'ACTIVE',
    });
  }, [open, usuario, form]);

  const onSubmit = async (values: UsuarioEditFormValues) => {
    setServerError(null);
    setSubmitting(true);
    try {
      const payload: UsuarioUpdateInput = {
        nombre: values.nombre.trim(),
        username: values.username.trim(),
        rolId: values.rolId,
        status: values.status,
      };
      const pw = values.password?.trim();
      if (pw && pw.length > 0) {
        payload.password = pw;
      }
      const ok = await onSubmitUpdate(usuario.id, payload);
      if (ok) {
        onClose();
      } else {
        const msg = useUsuarioStore.getState().error;
        setServerError(msg && msg.length > 0 ? msg : 'No se pudo guardar.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next && !submitting) onClose();
      }}
    >
      <DialogContent
        className="max-h-[90vh] overflow-y-auto sm:max-w-lg"
        onInteractOutside={(e) => submitting && e.preventDefault()}
        onEscapeKeyDown={(e) => submitting && e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>Editar usuario</DialogTitle>
          <DialogDescription>Modifica los datos. Deja la contraseña vacía para no cambiarla.</DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {serverError && (
              <Alert variant="destructive">
                <AlertDescription>{serverError}</AlertDescription>
              </Alert>
            )}

            <FormField
              control={form.control}
              name="nombre"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nombre completo</FormLabel>
                  <FormControl>
                    <Input placeholder="Nombre y apellido" disabled={submitting} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="username"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Usuario (login)</FormLabel>
                  <FormControl>
                    <Input
                      className="font-mono"
                      placeholder="admin"
                      autoComplete="username"
                      disabled={submitting}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nueva contraseña (opcional)</FormLabel>
                  <FormControl>
                    <Input
                      type="password"
                      autoComplete="new-password"
                      placeholder="Dejar vacío para no cambiar"
                      disabled={submitting}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="rolId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Rol</FormLabel>
                  <Select
                    disabled={submitting || rolesOpts.length === 0}
                    value={field.value > 0 ? String(field.value) : ''}
                    onValueChange={(v) => field.onChange(Number(v))}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue
                          placeholder={rolesOpts.length === 0 ? 'Cargando roles…' : 'Selecciona un rol'}
                        />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {rolesOpts.map((r) => (
                        <SelectItem key={r.id} value={String(r.id)}>
                          {r.nombre}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Estado</FormLabel>
                  <Select disabled={submitting} onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Estado" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="ACTIVE">Activo</SelectItem>
                      <SelectItem value="INACTIVE">Inactivo</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter className="gap-2 sm:gap-0">
              <Button type="button" variant="outline" disabled={submitting} onClick={onClose}>
                Cancelar
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? 'Guardando…' : 'Guardar'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

export function UsuariosPage() {
  const {
    usuarios,
    total,
    page,
    pageSize,
    loading,
    listLoadOk,
    error,
    clearError,
    fetchUsuarios,
    setPage,
    setPageSize,
    createUsuario,
    updateUsuario,
    deleteUsuario,
  } = useUsuarioStore();

  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<Usuario | null>(null);

  useEffect(() => {
    void fetchUsuarios();
  }, [fetchUsuarios]);

  const openCreate = () => {
    setCreateOpen(true);
    setEditing(null);
  };

  const openEdit = (u: Usuario) => {
    setCreateOpen(false);
    setEditing(u);
  };

  const closeCreateModal = () => setCreateOpen(false);

  const closeEditModal = () => setEditing(null);

  const handleDelete = async (u: Usuario) => {
    const ok = window.confirm(
      `¿Eliminar el usuario «${u.nombre}» (${u.username})? Esta acción no se puede deshacer.`,
    );
    if (!ok) return;
    await deleteUsuario(u.id);
  };

  if (loading && !listLoadOk) {
    return (
      <div className="flex items-center justify-center py-12">
        <div
          className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent"
          aria-hidden
        />
      </div>
    );
  }

  if (error && !listLoadOk) {
    return (
      <Alert variant="destructive">
        <AlertDescription>Error: {error}</AlertDescription>
      </Alert>
    );
  }

  return (
    <div>
      <UsuarioCreateModal open={createOpen} onClose={closeCreateModal} onSubmitCreate={createUsuario} />
      {editing ? (
        <UsuarioEditModal
          key={editing.id}
          open
          usuario={editing}
          onClose={closeEditModal}
          onSubmitUpdate={updateUsuario}
        />
      ) : null}

      {error && listLoadOk && (
        <Alert variant="destructive" className="mb-4">
          <AlertDescription className="flex flex-wrap items-center justify-between gap-2">
            <span>Error: {error}</span>
            <Button type="button" variant="ghost" size="sm" className="h-auto p-0" onClick={() => clearError()}>
              Cerrar
            </Button>
          </AlertDescription>
        </Alert>
      )}

      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-xl font-semibold tracking-tight">Usuarios</h2>
        <Button type="button" onClick={openCreate}>
          + Nuevo usuario
        </Button>
      </div>

      <UsuariosFiltersBar />

      <UsuariosTable
        usuarios={usuarios}
        totalCount={total}
        onEdit={openEdit}
        onDelete={(u) => void handleDelete(u)}
        footer={
          <TablePagination
            page={page}
            pageSize={pageSize}
            total={total}
            onPageChange={(p) => void setPage(p)}
            onPageSizeChange={(s) => void setPageSize(s)}
          />
        }
      />
    </div>
  );
}
