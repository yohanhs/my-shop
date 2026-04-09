import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';

import { RolesFiltersBar } from '@/components/roles/RolesFiltersBar';
import { RolesTable } from '@/components/roles/RolesTable';
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
import { rolFormDefaultValues, rolFormSchema, type RolFormValues } from '@/schemas/rolFormSchema';
import type { Rol, RolInput } from '@/types/electron';
import { useRolStore } from '@/store/useRolStore';

type FormMode = 'create' | 'edit';

interface RolFormModalProps {
  open: boolean;
  mode: FormMode;
  rol: Rol | null;
  onClose: () => void;
  onSubmitCreate: (data: RolInput) => Promise<boolean>;
  onSubmitUpdate: (id: number, data: RolInput) => Promise<boolean>;
}

function RolFormModal({
  open,
  mode,
  rol,
  onClose,
  onSubmitCreate,
  onSubmitUpdate,
}: RolFormModalProps) {
  const [serverError, setServerError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const form = useForm<RolFormValues>({
    resolver: yupResolver(rolFormSchema),
    defaultValues: rolFormDefaultValues,
    mode: 'onTouched',
  });

  useEffect(() => {
    if (!open) return;
    setServerError(null);
    if (mode === 'edit' && rol) {
      form.reset({ nombre: rol.nombre });
    } else {
      form.reset(rolFormDefaultValues);
    }
  }, [open, mode, rol, form]);

  const onSubmit = async (values: RolFormValues) => {
    setServerError(null);
    setSubmitting(true);
    try {
      let ok = false;
      if (mode === 'create') {
        ok = await onSubmitCreate({ nombre: values.nombre.trim() });
      } else if (rol) {
        ok = await onSubmitUpdate(rol.id, { nombre: values.nombre.trim() });
      }
      if (ok) {
        onClose();
      } else {
        const msg = useRolStore.getState().error;
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
        className="sm:max-w-md"
        onInteractOutside={(e) => submitting && e.preventDefault()}
        onEscapeKeyDown={(e) => submitting && e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>{mode === 'create' ? 'Nuevo rol' : 'Editar rol'}</DialogTitle>
          <DialogDescription>
            {mode === 'create' ? 'Define un nombre único para el rol.' : 'Modifica el nombre del rol.'}
          </DialogDescription>
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
                  <FormLabel>Nombre</FormLabel>
                  <FormControl>
                    <Input placeholder="Ej. Cajero" disabled={submitting} {...field} />
                  </FormControl>
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

export function RolesPage() {
  const {
    roles,
    total,
    page,
    pageSize,
    loading,
    listLoadOk,
    error,
    clearError,
    fetchRoles,
    setPage,
    setPageSize,
    createRol,
    updateRol,
    deleteRol,
  } = useRolStore();

  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<FormMode>('create');
  const [editing, setEditing] = useState<Rol | null>(null);

  useEffect(() => {
    void fetchRoles();
  }, [fetchRoles]);

  const openCreate = () => {
    setModalMode('create');
    setEditing(null);
    setModalOpen(true);
  };

  const openEdit = (r: Rol) => {
    setModalMode('edit');
    setEditing(r);
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditing(null);
  };

  const handleDelete = async (r: Rol) => {
    const ok = window.confirm(`¿Eliminar el rol «${r.nombre}»? Solo es posible si no hay usuarios con ese rol.`);
    if (!ok) return;
    await deleteRol(r.id);
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
      <RolFormModal
        open={modalOpen}
        mode={modalMode}
        rol={editing}
        onClose={closeModal}
        onSubmitCreate={createRol}
        onSubmitUpdate={updateRol}
      />

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
        <h2 className="text-xl font-semibold tracking-tight">Roles</h2>
        <Button type="button" onClick={openCreate}>
          + Nuevo rol
        </Button>
      </div>

      <RolesFiltersBar />

      <RolesTable
        roles={roles}
        totalCount={total}
        onEdit={openEdit}
        onDelete={(r) => void handleDelete(r)}
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
