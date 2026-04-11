import { useEffect, useMemo, useState } from 'react';
import { useFieldArray, useForm, useWatch, type Resolver } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import { CircleHelp, Plus, Trash2 } from 'lucide-react';

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
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ProductoCombobox } from '@/components/ventas/ProductoCombobox';
import {
  ventaConDetallesToFormValues,
  ventaFormDefaultValues,
  ventaFormSchema,
  ventaFormToCreate,
  type VentaFormValues,
} from '@/schemas/ventaFormSchema';
import type { Producto, VentaConDetalles } from '@/types/electron';
import {
  loadProductosParaVenta,
  loadProductosParaVentaEditor,
  useVentaStore,
} from '@/store/useVentaStore';

export interface VentaEditorDialogProps {
  open: boolean;
  onClose: () => void;
  mode: 'create' | 'edit';
  /** Requerido cuando `mode === 'edit'`. */
  venta?: VentaConDetalles;
  onSuccess?: () => void;
}

export function VentaEditorDialog({ open, onClose, mode, venta, onSuccess }: VentaEditorDialogProps) {
  const createVenta = useVentaStore((s) => s.createVenta);
  const updateVenta = useVentaStore((s) => s.updateVenta);
  const [productos, setProductos] = useState<Producto[]>([]);
  const [serverError, setServerError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const form = useForm<VentaFormValues>({
    resolver: yupResolver(ventaFormSchema) as Resolver<VentaFormValues>,
    defaultValues: ventaFormDefaultValues,
    mode: 'onTouched',
  });

  const { fields, append, remove } = useFieldArray({ control: form.control, name: 'lineas' });

  const lineasW = useWatch({ control: form.control, name: 'lineas' });

  const byId = useMemo(() => new Map(productos.map((p) => [p.id, p])), [productos]);

  const totalPreview = useMemo(() => {
    if (!lineasW?.length) return 0;
    let t = 0;
    for (const l of lineasW) {
      if (!l) continue;
      const p = byId.get(l.productoId);
      if (p && l.cantidad > 0) {
        t += l.cantidad * p.precioVenta;
      }
    }
    return t;
  }, [lineasW, byId]);

  useEffect(() => {
    if (!open) return;
    if (mode === 'edit' && !venta) return;

    setServerError(null);

    if (mode === 'edit' && venta) {
      const vals = ventaConDetallesToFormValues(venta);
      form.reset(vals);
      void loadProductosParaVentaEditor(vals.lineas).then(setProductos);
    } else {
      form.reset(ventaFormDefaultValues);
      void loadProductosParaVenta().then(setProductos);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- al abrir o cambiar venta en edición; `form` es estable
  }, [open, mode, venta?.id, venta?.updatedAt]);

  const onSubmit = async (values: VentaFormValues) => {
    setServerError(null);
    for (let i = 0; i < values.lineas.length; i += 1) {
      const l = values.lineas[i];
      const p = byId.get(l.productoId);
      if (p && l.cantidad > p.stockActual) {
        form.setError(`lineas.${i}.cantidad`, {
          type: 'manual',
          message: `Máximo ${p.stockActual} unidades (stock del producto).`,
        });
        return;
      }
    }
    setSubmitting(true);
    try {
      const payload = ventaFormToCreate(values);
      const ok =
        mode === 'edit' && venta
          ? await updateVenta(venta.id, payload)
          : await createVenta(payload);
      if (ok) {
        onSuccess?.();
        onClose();
      } else {
        const msg = useVentaStore.getState().error;
        setServerError(msg && msg.length > 0 ? msg : 'No se pudo guardar.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (mode === 'edit' && !venta) {
    return null;
  }

  const isEdit = mode === 'edit';

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next && !submitting) onClose();
      }}
    >
      <DialogContent
        className="max-h-[90vh] max-w-2xl overflow-y-auto"
        onInteractOutside={(e) => {
          if (
            e.target instanceof Element &&
            e.target.closest('[data-venta-producto-popover]')
          ) {
            e.preventDefault();
            return;
          }
          if (submitting) e.preventDefault();
        }}
        onEscapeKeyDown={(e) => submitting && e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>{isEdit ? `Editar venta #${venta!.id}` : 'Nueva venta'}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? 'Se revierte el stock de la venta anterior y se aplican los productos con el precio de venta actual del catálogo.'
              : 'Agrega productos a la venta. El precio aplicado es el precio de venta actual y el stock se descuenta al guardar.'}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {serverError && (
              <Alert variant="destructive">
                <AlertDescription>{serverError}</AlertDescription>
              </Alert>
            )}

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:items-start">
              <FormField
                control={form.control}
                name="metodoPago"
                render={({ field }) => (
                  <FormItem className="flex flex-col gap-2 space-y-0">
                    <div className="flex min-h-5 items-center gap-1.5">
                      <FormLabel className="mb-0">Método de pago</FormLabel>
                      <span className="size-4 shrink-0" aria-hidden />
                    </div>
                    <Select disabled={submitting} onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="h-9">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="EFECTIVO">Efectivo</SelectItem>
                        <SelectItem value="TARJETA">Tarjeta</SelectItem>
                        <SelectItem value="TRANSFERENCIA">Transferencia</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="ticketFolio"
                render={({ field }) => (
                  <FormItem className="flex flex-col gap-2 space-y-0">
                    <div className="flex min-h-5 items-center gap-1.5">
                      <FormLabel className="mb-0">Folio en ticket / factura</FormLabel>
                      <TooltipProvider delayDuration={200}>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button
                              type="button"
                              className="inline-flex size-4 shrink-0 items-center justify-center rounded-full text-muted-foreground outline-none ring-offset-background hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                              aria-label="Información sobre el folio"
                            >
                              <CircleHelp className="size-4" aria-hidden />
                            </button>
                          </TooltipTrigger>
                          <TooltipContent side="top" className="max-w-xs text-left leading-snug">
                            <p>
                              El número interno de la venta es siempre «Venta #…». Este campo es lo que verás en el
                              comprobante: si lo dejas vacío, se guardará{' '}
                              <span className="font-mono">V-</span> más ese número (p. ej.{' '}
                              <span className="font-mono">V-42</span>). Usa otro valor solo si facturas con otro
                              folio o anotas un ticket de caja distinto.
                            </p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                    <FormControl>
                      <Input
                        className="h-9"
                        placeholder="Vacío = folio automático V-…"
                        disabled={submitting}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="space-y-2">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                <Label>Productos</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="gap-1"
                  disabled={submitting}
                  onClick={() => append({ productoId: 0, cantidad: 1 })}
                >
                  <Plus className="h-4 w-4" />
                  Añadir producto
                </Button>
              </div>

              <div className="space-y-3 rounded-md border p-3">
                {fields.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No hay productos. Pulsa «Añadir producto».</p>
                ) : (
                  fields.map((fieldRow, index) => (
                    <div
                      key={fieldRow.id}
                      className="grid gap-3 border-b border-border pb-3 last:border-0 last:pb-0 sm:grid-cols-[1fr_120px_auto]"
                    >
                      <FormField
                        control={form.control}
                        name={`lineas.${index}.productoId`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className={index > 0 ? 'sr-only' : undefined}>Producto</FormLabel>
                            <FormControl>
                              <ProductoCombobox
                                ref={field.ref}
                                name={field.name}
                                value={field.value ?? 0}
                                onChange={(productoId) => {
                                  field.onChange(productoId);
                                  const p = byId.get(productoId);
                                  if (!p || p.stockActual < 1) return;
                                  const maxStock = p.stockActual;
                                  const qty = form.getValues(`lineas.${index}.cantidad`);
                                  if (Number.isFinite(qty) && qty > maxStock) {
                                    form.setValue(`lineas.${index}.cantidad`, maxStock, {
                                      shouldDirty: true,
                                      shouldValidate: true,
                                    });
                                  }
                                }}
                                onBlur={field.onBlur}
                                disabled={submitting || productos.length === 0}
                                productos={productos}
                                placeholder={
                                  productos.length === 0 ? 'Cargando…' : 'Buscar por nombre o SKU…'
                                }
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name={`lineas.${index}.cantidad`}
                        render={({ field }) => {
                          const pid = lineasW?.[index]?.productoId ?? 0;
                          const prod = pid > 0 ? byId.get(pid) : undefined;
                          const maxStock =
                            prod !== undefined && prod.stockActual >= 1 ? prod.stockActual : undefined;
                          const sinStock = prod !== undefined && prod.stockActual < 1;

                          return (
                            <FormItem>
                              <FormLabel className={index > 0 ? 'sr-only' : undefined}>Cantidad</FormLabel>
                              <FormControl>
                                <Input
                                  type="number"
                                  min={1}
                                  max={maxStock}
                                  step={1}
                                  disabled={submitting || !prod || sinStock}
                                  value={Number.isFinite(field.value) ? field.value : ''}
                                  onChange={(e) => {
                                    const raw = e.target.value;
                                    let n = raw === '' ? Number.NaN : Number.parseInt(raw, 10);
                                    if (Number.isFinite(n) && maxStock !== undefined && n > maxStock) {
                                      n = maxStock;
                                    }
                                    field.onChange(n);
                                  }}
                                  onBlur={() => {
                                    const n = form.getValues(`lineas.${index}.cantidad`);
                                    if (
                                      Number.isFinite(n) &&
                                      maxStock !== undefined &&
                                      n > maxStock
                                    ) {
                                      form.setValue(`lineas.${index}.cantidad`, maxStock, {
                                        shouldValidate: true,
                                      });
                                    }
                                    field.onBlur();
                                  }}
                                  name={field.name}
                                  ref={field.ref}
                                />
                              </FormControl>
                              {sinStock ? (
                                <p className="text-[11px] text-muted-foreground">
                                  Sin stock. Cambia de producto o quita la línea.
                                </p>
                              ) : prod && maxStock !== undefined ? (
                                <p className="text-[11px] text-muted-foreground">Máx. {maxStock} (stock)</p>
                              ) : null}
                              <FormMessage />
                            </FormItem>
                          );
                        }}
                      />
                      <div className="flex items-end justify-end">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="text-destructive hover:text-destructive"
                          disabled={submitting || fields.length <= 1}
                          aria-label="Quitar producto"
                          onClick={() => remove(index)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="flex items-center justify-between rounded-md bg-muted/50 px-3 py-2 text-sm">
              <span className="text-muted-foreground">
                {isEdit ? 'Total estimado (precios actuales)' : 'Total estimado'}
              </span>
              <span className="text-lg font-semibold">${totalPreview.toFixed(2)}</span>
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button type="button" variant="outline" disabled={submitting} onClick={onClose}>
                Cancelar
              </Button>
              <Button type="submit" disabled={submitting || productos.length === 0}>
                {submitting ? 'Guardando…' : isEdit ? 'Guardar cambios' : 'Registrar venta'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
