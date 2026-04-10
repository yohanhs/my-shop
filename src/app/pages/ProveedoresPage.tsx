import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';

import { ProveedoresFiltersBar } from '@/components/proveedores/ProveedoresFiltersBar';
import { ProveedoresTable } from '@/components/proveedores/ProveedoresTable';
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
import { Textarea } from '@/components/ui/textarea';
import {
  proveedorFormDefaultValues,
  proveedorFormSchema,
  proveedorFormToInput,
  proveedorFormToUpdate,
  type ProveedorFormValues,
} from '@/schemas/proveedorFormSchema';
import type { Proveedor, ProveedorInput, ProveedorUpdateInput } from '@/types/electron';
import { useProveedorStore } from '@/store/useProveedorStore';

type FormMode = 'create' | 'edit';

interface ProveedorFormModalProps {
  open: boolean;
  mode: FormMode;
  proveedor: Proveedor | null;
  onClose: () => void;
  onSubmitCreate: (data: ProveedorInput) => Promise<boolean>;
  onSubmitUpdate: (id: number, data: ProveedorUpdateInput) => Promise<boolean>;
}

function ProveedorFormModal({
  open,
  mode,
  proveedor,
  onClose,
  onSubmitCreate,
  onSubmitUpdate,
}: ProveedorFormModalProps) {
  const [serverError, setServerError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const form = useForm<ProveedorFormValues>({
    resolver: yupResolver(proveedorFormSchema),
    defaultValues: proveedorFormDefaultValues,
    mode: 'onTouched',
  });

  useEffect(() => {
    if (!open) return;
    setServerError(null);
    if (mode === 'edit' && proveedor) {
      form.reset({
        nombre: proveedor.nombre,
        telefono: proveedor.telefono ?? '',
        empresa: proveedor.empresa ?? '',
        direccion: proveedor.direccion ?? '',
        email: proveedor.email ?? '',
      });
    } else {
      form.reset(proveedorFormDefaultValues);
    }
  }, [open, mode, proveedor, form]);

  const onSubmit = async (values: ProveedorFormValues) => {
    setServerError(null);
    setSubmitting(true);
    try {
      let ok = false;
      if (mode === 'create') {
        ok = await onSubmitCreate(proveedorFormToInput(values));
      } else if (proveedor) {
        ok = await onSubmitUpdate(proveedor.id, proveedorFormToUpdate(values));
      }
      if (ok) {
        onClose();
      } else {
        const msg = useProveedorStore.getState().error;
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
          <DialogTitle>{mode === 'create' ? 'Nuevo proveedor' : 'Editar proveedor'}</DialogTitle>
          <DialogDescription>
            {mode === 'create'
              ? 'Registra los datos del proveedor. Solo el nombre es obligatorio.'
              : 'Actualiza la información de contacto del proveedor.'}
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
                    <Input placeholder="Nombre o razón comercial" disabled={submitting} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="empresa"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Empresa (opcional)</FormLabel>
                  <FormControl>
                    <Input placeholder="Nombre de la empresa" disabled={submitting} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="telefono"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Teléfono (opcional)</FormLabel>
                    <FormControl>
                      <Input placeholder="Teléfono" disabled={submitting} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email (opcional)</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="correo@ejemplo.com" disabled={submitting} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="direccion"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Dirección (opcional)</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Calle, ciudad…" rows={3} disabled={submitting} {...field} />
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

export function ProveedoresPage() {
  const {
    proveedores,
    total,
    page,
    pageSize,
    loading,
    listLoadOk,
    error,
    clearError,
    fetchProveedores,
    setPage,
    setPageSize,
    createProveedor,
    updateProveedor,
    deleteProveedor,
  } = useProveedorStore();

  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<FormMode>('create');
  const [editing, setEditing] = useState<Proveedor | null>(null);

  useEffect(() => {
    void fetchProveedores();
  }, [fetchProveedores]);

  const openCreate = () => {
    setModalMode('create');
    setEditing(null);
    setModalOpen(true);
  };

  const openEdit = (p: Proveedor) => {
    setModalMode('edit');
    setEditing(p);
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditing(null);
  };

  const handleDelete = async (p: Proveedor) => {
    const ok = window.confirm(`¿Eliminar el proveedor «${p.nombre}»? Esta acción no se puede deshacer.`);
    if (!ok) return;
    await deleteProveedor(p.id);
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
      <ProveedorFormModal
        key={`${modalMode}-${editing?.id ?? 'new'}`}
        open={modalOpen}
        mode={modalMode}
        proveedor={editing}
        onClose={closeModal}
        onSubmitCreate={createProveedor}
        onSubmitUpdate={updateProveedor}
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
        <h2 className="text-xl font-semibold tracking-tight">Proveedores</h2>
        <Button type="button" onClick={openCreate}>
          + Nuevo proveedor
        </Button>
      </div>

      <ProveedoresFiltersBar />

      <ProveedoresTable
        proveedores={proveedores}
        totalCount={total}
        onEdit={openEdit}
        onDelete={(p) => void handleDelete(p)}
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
