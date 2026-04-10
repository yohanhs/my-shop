import { useEffect, useState } from 'react';
import { useForm, type Resolver } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import { format } from 'date-fns';

import { GastosFiltersBar } from '@/components/gastos/GastosFiltersBar';
import { GastosTable } from '@/components/gastos/GastosTable';
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
import { DatePickerField } from '@/components/ui/date-picker-field';
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
  gastoFormDefaultValues,
  gastoFormSchema,
  gastoFormToInput,
  gastoFormToUpdate,
  gastoToFormValues,
  type GastoFormValues,
} from '@/schemas/gastoFormSchema';
import type { Gasto, GastoInput, GastoUpdateInput } from '@/types/electron';
import { useGastoStore } from '@/store/useGastoStore';

type FormMode = 'create' | 'edit';

interface GastoFormModalProps {
  open: boolean;
  mode: FormMode;
  gasto: Gasto | null;
  onClose: () => void;
  onSubmitCreate: (data: GastoInput) => Promise<boolean>;
  onSubmitUpdate: (id: number, data: GastoUpdateInput) => Promise<boolean>;
}

function GastoFormModal({
  open,
  mode,
  gasto,
  onClose,
  onSubmitCreate,
  onSubmitUpdate,
}: GastoFormModalProps) {
  const [serverError, setServerError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const todayYmd = format(new Date(), 'yyyy-MM-dd');

  const form = useForm<GastoFormValues>({
    resolver: yupResolver(gastoFormSchema) as Resolver<GastoFormValues>,
    defaultValues: gastoFormDefaultValues(todayYmd),
    mode: 'onTouched',
  });

  useEffect(() => {
    if (!open) return;
    setServerError(null);
    if (mode === 'edit' && gasto) {
      form.reset(gastoToFormValues(gasto));
    } else {
      form.reset(gastoFormDefaultValues(todayYmd));
    }
  }, [open, mode, gasto, form, todayYmd]);

  const onSubmit = async (values: GastoFormValues) => {
    setServerError(null);
    setSubmitting(true);
    try {
      let ok = false;
      if (mode === 'create') {
        ok = await onSubmitCreate(gastoFormToInput(values));
      } else if (gasto) {
        ok = await onSubmitUpdate(gasto.id, gastoFormToUpdate(values));
      }
      if (ok) {
        onClose();
      } else {
        const msg = useGastoStore.getState().error;
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
          <DialogTitle>{mode === 'create' ? 'Nuevo gasto' : 'Editar gasto'}</DialogTitle>
          <DialogDescription>
            {mode === 'create'
              ? 'Registra un egreso con concepto, categoría, monto y fecha.'
              : 'Actualiza los datos del gasto.'}
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
              name="concepto"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Concepto</FormLabel>
                  <FormControl>
                    <Input placeholder="Ej. Renta local, luz, papelería…" disabled={submitting} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="monto"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Monto</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={0.01}
                        step={0.01}
                        disabled={submitting}
                        value={Number.isFinite(field.value) ? field.value : ''}
                        onChange={(e) => {
                          const raw = e.target.value;
                          field.onChange(raw === '' ? Number.NaN : Number.parseFloat(raw));
                        }}
                        onBlur={field.onBlur}
                        name={field.name}
                        ref={field.ref}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="fecha"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Fecha</FormLabel>
                    <FormControl>
                      <DatePickerField
                        value={field.value}
                        onChange={field.onChange}
                        disabled={submitting}
                        placeholder="Elegir fecha"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="categoria"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Categoría</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Ej. Arriendo, Servicios, Nómina, Otros…"
                      disabled={submitting}
                      list="gasto-categorias-sugeridas"
                      {...field}
                    />
                  </FormControl>
                  <datalist id="gasto-categorias-sugeridas">
                    <option value="Arriendo" />
                    <option value="Servicios" />
                    <option value="Nómina" />
                    <option value="Mantenimiento" />
                    <option value="Papelería" />
                    <option value="Transporte" />
                    <option value="Otros" />
                  </datalist>
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

export function GastosPage() {
  const {
    gastos,
    total,
    page,
    pageSize,
    loading,
    listLoadOk,
    error,
    clearError,
    fetchGastos,
    setPage,
    setPageSize,
    createGasto,
    updateGasto,
    deleteGasto,
  } = useGastoStore();

  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<FormMode>('create');
  const [editing, setEditing] = useState<Gasto | null>(null);

  useEffect(() => {
    void fetchGastos();
  }, [fetchGastos]);

  const openCreate = () => {
    setModalMode('create');
    setEditing(null);
    setModalOpen(true);
  };

  const openEdit = (g: Gasto) => {
    setModalMode('edit');
    setEditing(g);
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditing(null);
  };

  const handleDelete = async (g: Gasto) => {
    const ok = window.confirm(`¿Eliminar el gasto «${g.concepto}» por $${g.monto.toFixed(2)}?`);
    if (!ok) return;
    await deleteGasto(g.id);
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
      <GastoFormModal
        key={`${modalMode}-${editing?.id ?? 'new'}`}
        open={modalOpen}
        mode={modalMode}
        gasto={editing}
        onClose={closeModal}
        onSubmitCreate={createGasto}
        onSubmitUpdate={updateGasto}
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
        <h2 className="text-xl font-semibold tracking-tight">Gastos</h2>
        <Button type="button" onClick={openCreate}>
          + Registrar gasto
        </Button>
      </div>

      <GastosFiltersBar />

      <GastosTable
        gastos={gastos}
        totalCount={total}
        onEdit={openEdit}
        onDelete={(g) => void handleDelete(g)}
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
