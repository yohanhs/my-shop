import { useCallback, useEffect, useState } from 'react';
import { format } from 'date-fns';
import { useForm, type Resolver } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';

import { ProductoCombobox } from '@/components/ventas/ProductoCombobox';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { TablePagination } from '@/components/ui/table-pagination';
import { mermaFormDefaultValues, mermaFormSchema, type MermaFormValues } from '@/schemas/mermaFormSchema';
import {
  defaultProductoListFilters,
  type MermaListItem,
  type MermaListPagedParams,
  type Producto,
} from '@/types/electron';

const PRODUCTOS_PAGE_SIZE = 400;

function formatFechaMovimiento(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return new Intl.DateTimeFormat('es-MX', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(d);
}

export function MermasPage() {
  const api = window.api?.merma;
  const productoApi = window.api?.producto;

  const todayYmd = format(new Date(), 'yyyy-MM-dd');

  const [productos, setProductos] = useState<Producto[]>([]);
  const [loadingProductos, setLoadingProductos] = useState(true);
  const [listError, setListError] = useState<string | null>(null);
  const [items, setItems] = useState<MermaListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  /** Filtros aplicados al listado (se actualizan con «Aplicar filtros»). */
  const [applied, setApplied] = useState({
    productoBuscar: '',
    fechaDesde: '',
    fechaHasta: '',
  });
  const [draftBuscar, setDraftBuscar] = useState('');
  const [draftDesde, setDraftDesde] = useState('');
  const [draftHasta, setDraftHasta] = useState('');
  const [listNonce, setListNonce] = useState(0);
  const [loadingList, setLoadingList] = useState(true);

  const loadProductos = useCallback(async () => {
    if (!productoApi) return;
    setLoadingProductos(true);
    try {
      const res = await productoApi.listPaged({
        page: 1,
        pageSize: PRODUCTOS_PAGE_SIZE,
        ...defaultProductoListFilters,
        status: 'ACTIVE',
      });
      setProductos(res.items);
    } catch {
      setProductos([]);
    } finally {
      setLoadingProductos(false);
    }
  }, [productoApi]);

  const loadList = useCallback(async () => {
    if (!api) return;
    setLoadingList(true);
    setListError(null);
    try {
      const params: MermaListPagedParams = {
        page,
        pageSize,
        productoBuscar: applied.productoBuscar,
        fechaDesde: applied.fechaDesde,
        fechaHasta: applied.fechaHasta,
      };
      const res = await api.listPaged(params);
      setItems(res.items);
      setTotal(res.total);
    } catch (e) {
      setListError((e as Error).message);
    } finally {
      setLoadingList(false);
    }
  }, [api, page, pageSize, applied, listNonce]);

  useEffect(() => {
    void loadProductos();
  }, [loadProductos]);

  useEffect(() => {
    void loadList();
  }, [loadList]);

  const form = useForm<MermaFormValues>({
    resolver: yupResolver(mermaFormSchema) as Resolver<MermaFormValues>,
    defaultValues: mermaFormDefaultValues(todayYmd),
    mode: 'onTouched',
  });

  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async (values: MermaFormValues) => {
    if (!api) return;
    setSubmitError(null);
    setSubmitting(true);
    try {
      await api.registrar({
        productoId: values.productoId,
        cantidad: values.cantidad,
        fecha: values.fecha.trim() === '' ? null : values.fecha.trim(),
      });
      form.reset(mermaFormDefaultValues(todayYmd));
      setPage(1);
      await loadProductos();
      setListNonce((n) => n + 1);
    } catch (e) {
      setSubmitError((e as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  const onBuscar = () => {
    setApplied({
      productoBuscar: draftBuscar.trim(),
      fechaDesde: draftDesde.trim(),
      fechaHasta: draftHasta.trim(),
    });
    setPage(1);
  };

  if (!api || !productoApi) {
    return (
      <Alert variant="destructive">
        <AlertDescription>Ejecuta la app con Electron para registrar mermas.</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Mermas</h1>
        <p className="text-sm text-muted-foreground">
          Salidas de inventario sin venta. Se guardan en movimientos de stock con motivo «MERMA».
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Registrar merma</CardTitle>
          <CardDescription>
            El stock del producto baja de inmediato. Solo productos activos; no puede superar el stock disponible.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="grid max-w-xl gap-4">
              {submitError ? (
                <Alert variant="destructive">
                  <AlertDescription>{submitError}</AlertDescription>
                </Alert>
              ) : null}
              <FormField
                control={form.control}
                name="productoId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Producto</FormLabel>
                    <FormControl>
                      <ProductoCombobox
                        value={field.value}
                        onChange={field.onChange}
                        onBlur={field.onBlur}
                        disabled={submitting || loadingProductos}
                        productos={productos}
                        name={field.name}
                        aria-invalid={!!form.formState.errors.productoId}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="cantidad"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cantidad</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={1}
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
                name="fecha"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Fecha del movimiento</FormLabel>
                    <FormControl>
                      <DatePickerField
                        id="merma-fecha"
                        value={field.value}
                        onChange={field.onChange}
                        disabled={submitting}
                      />
                    </FormControl>
                    <p className="text-xs text-muted-foreground">
                      Opcional: por defecto se usa la fecha y hora actuales al guardar.
                    </p>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="flex justify-end">
                <Button type="submit" disabled={submitting}>
                  {submitting ? 'Guardando…' : 'Registrar merma'}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Historial</CardTitle>
          <CardDescription>
            Costo referencia = cantidad × costo actual del producto al cargar la lista (no sustituye un costo
            histórico guardado).
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
            <div className="grid gap-1">
              <Label htmlFor="merma-filtro-producto" className="text-xs">
                Producto (nombre o SKU)
              </Label>
              <Input
                id="merma-filtro-producto"
                value={draftBuscar}
                onChange={(e) => setDraftBuscar(e.target.value)}
                placeholder="Filtrar…"
                className="h-9 w-full sm:w-56"
              />
            </div>
            <div className="grid gap-1">
              <Label htmlFor="merma-desde" className="text-xs">
                Desde
              </Label>
              <DatePickerField
                id="merma-desde"
                value={draftDesde}
                onChange={setDraftDesde}
              />
            </div>
            <div className="grid gap-1">
              <Label htmlFor="merma-hasta" className="text-xs">
                Hasta
              </Label>
              <DatePickerField
                id="merma-hasta"
                value={draftHasta}
                onChange={setDraftHasta}
              />
            </div>
            <Button type="button" variant="secondary" size="sm" className="h-9" onClick={onBuscar}>
              Aplicar filtros
            </Button>
          </div>

          {listError ? (
            <Alert variant="destructive">
              <AlertDescription>{listError}</AlertDescription>
            </Alert>
          ) : null}

          {items.length === 0 && !loadingList ? (
            <p className="py-10 text-center text-sm text-muted-foreground">
              {total === 0 ? 'No hay mermas registradas.' : 'Sin resultados en esta página.'}
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="whitespace-nowrap">Fecha</TableHead>
                  <TableHead>Producto</TableHead>
                  <TableHead className="hidden sm:table-cell">SKU</TableHead>
                  <TableHead className="text-right tabular-nums">Cant.</TableHead>
                  <TableHead className="hidden md:table-cell">Usuario</TableHead>
                  <TableHead className="text-right tabular-nums">Costo ref.</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="whitespace-nowrap text-sm">{formatFechaMovimiento(r.fecha)}</TableCell>
                    <TableCell className="max-w-[200px]">
                      <span className="line-clamp-2 font-medium" title={r.productoNombre}>
                        {r.productoNombre}
                      </span>
                    </TableCell>
                    <TableCell className="hidden font-mono text-xs text-muted-foreground sm:table-cell">
                      {r.productoSku}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{r.cantidad}</TableCell>
                    <TableCell className="hidden text-sm text-muted-foreground md:table-cell">
                      {r.usuarioNombre}
                    </TableCell>
                    <TableCell className="text-right text-sm tabular-nums">
                      ${r.costoReferencia.toFixed(2)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}

          <TablePagination page={page} pageSize={pageSize} total={total} onPageChange={setPage} />
        </CardContent>
      </Card>
    </div>
  );
}
