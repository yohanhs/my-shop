import { useEffect, useState } from 'react';
import { format, parseISO } from 'date-fns';
import { useLocation, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';

import { ProductosFiltersBar } from '@/components/productos/ProductosFiltersBar';
import { ProductosTable } from '@/components/productos/ProductosTable';
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
import { DatePickerField } from '@/components/ui/date-picker-field';
import { ImageDropField } from '@/components/ui/image-drop-field';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  productoFormDefaultValues,
  productoFormSchema,
  type ProductoFormValues,
} from '@/schemas/productoFormSchema';
import type { Producto, ProductoInput, ProductoUpdateInput } from '@/types/electron';
import { useProductStore } from '../store/useProductStore';

type FormMode = 'create' | 'edit';

function productoFechaCadToForm(iso: string | null | undefined): string {
  if (!iso) return '';
  try {
    return format(parseISO(iso), 'yyyy-MM-dd');
  } catch {
    return '';
  }
}

interface ProductoFormModalProps {
  open: boolean;
  mode: FormMode;
  product: Producto | null;
  onClose: () => void;
  onSubmitCreate: (data: ProductoInput) => Promise<boolean>;
  onSubmitUpdate: (id: number, data: ProductoUpdateInput) => Promise<boolean>;
}

function ProductoFormModal({
  open,
  mode,
  product,
  onClose,
  onSubmitCreate,
  onSubmitUpdate,
}: ProductoFormModalProps) {
  const [serverError, setServerError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const form = useForm<ProductoFormValues>({
    resolver: yupResolver(productoFormSchema),
    defaultValues: productoFormDefaultValues,
    mode: 'onTouched',
  });

  useEffect(() => {
    if (!open) return;
    setServerError(null);
    if (mode === 'edit' && product) {
      form.reset({
        nombre: product.nombre,
        sku: product.sku,
        descripcion: product.descripcion ?? '',
        precioCosto: product.precioCosto,
        precioVenta: product.precioVenta,
        stockActual: product.stockActual,
        stockMinimo: product.stockMinimo,
        imagenPath: product.imagenPath ?? '',
        fechaCaducidad: productoFechaCadToForm(product.fechaCaducidad),
        status: product.status === 'INACTIVE' ? 'INACTIVE' : 'ACTIVE',
      });
    } else {
      form.reset(productoFormDefaultValues);
    }
  }, [open, mode, product, form]);

  const onSubmit = async (values: ProductoFormValues) => {
    setServerError(null);
    setSubmitting(true);
    try {
      const imagenPath = values.imagenPath.trim() || undefined;
      const fechaCaducidad = values.fechaCaducidad.trim() || null;
      const descripcionNorm = values.descripcion.trim();
      const descripcionDb = descripcionNorm.length > 0 ? descripcionNorm : null;
      let ok = false;
      if (mode === 'create') {
        ok = await onSubmitCreate({
          nombre: values.nombre.trim(),
          sku: values.sku.trim(),
          descripcion: descripcionDb,
          precioCosto: values.precioCosto,
          precioVenta: values.precioVenta,
          stockActual: values.stockActual,
          stockMinimo: values.stockMinimo,
          imagenPath,
          fechaCaducidad,
        });
      } else if (product) {
        ok = await onSubmitUpdate(product.id, {
          nombre: values.nombre.trim(),
          sku: values.sku.trim(),
          descripcion: descripcionDb,
          precioCosto: values.precioCosto,
          precioVenta: values.precioVenta,
          stockActual: values.stockActual,
          stockMinimo: values.stockMinimo,
          imagenPath,
          fechaCaducidad,
          status: values.status,
        });
      }
      if (ok) {
        onClose();
      } else {
        const msg = useProductStore.getState().error;
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
          <DialogTitle>{mode === 'create' ? 'Nuevo producto' : 'Editar producto'}</DialogTitle>
          <DialogDescription>
            {mode === 'create'
              ? 'Completa los datos para registrar un producto.'
              : 'Modifica los campos y guarda los cambios.'}
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
                    <Input placeholder="Nombre del producto" disabled={submitting} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="sku"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>SKU</FormLabel>
                  <FormControl>
                    <Input className="font-mono" placeholder="SKU-001" disabled={submitting} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="descripcion"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descripción (opcional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Detalle del producto…"
                      disabled={submitting}
                      rows={3}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="precioCosto"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Precio costo</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={0}
                        step="0.01"
                        disabled={submitting}
                        value={Number.isFinite(field.value) ? field.value : ''}
                        onChange={(e) => {
                          const raw = e.target.value;
                          field.onChange(raw === '' ? Number.NaN : Number(raw));
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
                name="precioVenta"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Precio venta</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={0}
                        step="0.01"
                        disabled={submitting}
                        value={Number.isFinite(field.value) ? field.value : ''}
                        onChange={(e) => {
                          const raw = e.target.value;
                          field.onChange(raw === '' ? Number.NaN : Number(raw));
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
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="stockActual"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Stock actual</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={0}
                        step={1}
                        disabled={submitting}
                        value={Number.isFinite(field.value) ? field.value : ''}
                        onChange={(e) => {
                          const raw = e.target.value;
                          field.onChange(raw === '' ? Number.NaN : Number.parseInt(raw, 10));
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
                name="stockMinimo"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Stock mínimo</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={0}
                        step={1}
                        disabled={submitting}
                        value={Number.isFinite(field.value) ? field.value : ''}
                        onChange={(e) => {
                          const raw = e.target.value;
                          field.onChange(raw === '' ? Number.NaN : Number.parseInt(raw, 10));
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
            </div>

            <FormField
              control={form.control}
              name="imagenPath"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Imagen del producto (opcional)</FormLabel>
                  <FormControl>
                    <ImageDropField
                      value={field.value ?? ''}
                      onChange={field.onChange}
                      disabled={submitting}
                      browseLabel="Elegir imagen…"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="fechaCaducidad"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Caducidad (opcional)</FormLabel>
                  <FormControl>
                    <DatePickerField
                      value={field.value ?? ''}
                      onChange={field.onChange}
                      disabled={submitting}
                      placeholder="Sin fecha de caducidad"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {mode === 'edit' && (
              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Estado</FormLabel>
                    <Select
                      disabled={submitting}
                      onValueChange={field.onChange}
                      value={field.value}
                    >
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
            )}

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

export function ProductosPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const {
    productos,
    total,
    page,
    pageSize,
    loading,
    listLoadOk,
    error,
    clearError,
    fetchProductos,
    setPage,
    setPageSize,
    createProducto,
    updateProducto,
    deleteProducto,
  } = useProductStore();
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<FormMode>('create');
  const [editing, setEditing] = useState<Producto | null>(null);

  useEffect(() => {
    void fetchProductos();
  }, [fetchProductos]);

  useEffect(() => {
    const editId = (location.state as { editProductId?: number } | undefined)?.editProductId;
    if (editId == null) return;

    const clearEditState = () => {
      navigate(location.pathname, { replace: true, state: {} });
    };

    if (loading && !listLoadOk) return;

    const found = productos.find((x) => x.id === editId);
    if (found) {
      setModalMode('edit');
      setEditing(found);
      setModalOpen(true);
      clearEditState();
      return;
    }

    if (!listLoadOk) return;

    let cancelled = false;
    void (async () => {
      try {
        const api = typeof window !== 'undefined' ? window.api?.producto : undefined;
        if (!api) {
          clearEditState();
          return;
        }
        const p = await api.getById(editId);
        if (cancelled) return;
        clearEditState();
        if (p) {
          setModalMode('edit');
          setEditing(p);
          setModalOpen(true);
        }
      } catch {
        if (!cancelled) clearEditState();
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [location.state, location.pathname, productos, loading, listLoadOk, navigate]);

  const openCreate = () => {
    setModalMode('create');
    setEditing(null);
    setModalOpen(true);
  };

  const openEdit = (p: Producto) => {
    setModalMode('edit');
    setEditing(p);
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditing(null);
  };

  const handleDelete = async (p: Producto) => {
    const ok = window.confirm(
      `¿Eliminar el producto «${p.nombre}»? Esta acción no se puede deshacer.`,
    );
    if (!ok) return;
    await deleteProducto(p.id);
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
      <ProductoFormModal
        open={modalOpen}
        mode={modalMode}
        product={editing}
        onClose={closeModal}
        onSubmitCreate={createProducto}
        onSubmitUpdate={updateProducto}
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
        <h2 className="text-xl font-semibold tracking-tight">Productos</h2>
        <Button type="button" onClick={openCreate}>
          + Nuevo producto
        </Button>
      </div>

      <ProductosFiltersBar />

      <ProductosTable
        productos={productos}
        totalCount={total}
        onView={(p) => navigate(`/productos/${p.id}`)}
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
