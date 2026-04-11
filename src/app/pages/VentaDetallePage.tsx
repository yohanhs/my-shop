import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Ban, Pencil, Printer } from 'lucide-react';

import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { VentaEditorDialog } from '@/components/ventas/VentaEditorDialog';
import type { VentaConDetalles } from '@/types/electron';
import { openVentaTicketPrintWindow } from '@/lib/ventaTicketPrint';
import { useVentaStore } from '@/store/useVentaStore';

function formatFecha(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return new Intl.DateTimeFormat('es-MX', {
    dateStyle: 'full',
    timeStyle: 'short',
  }).format(d);
}

function metodoLabel(m: string): string {
  switch (m) {
    case 'EFECTIVO':
      return 'Efectivo';
    case 'TARJETA':
      return 'Tarjeta';
    case 'TRANSFERENCIA':
      return 'Transferencia';
    default:
      return m;
  }
}

export function VentaDetallePage() {
  const { id: idParam } = useParams();
  const anularVenta = useVentaStore((s) => s.anularVenta);

  const [venta, setVenta] = useState<VentaConDetalles | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [anulando, setAnulando] = useState(false);
  const [editOpen, setEditOpen] = useState(false);

  const id = idParam ? Number.parseInt(idParam, 10) : Number.NaN;

  useEffect(() => {
    if (!Number.isFinite(id) || id < 1) {
      setLoadError('Venta no válida.');
      setLoading(false);
      return;
    }

    const api = typeof window !== 'undefined' ? window.api?.venta : undefined;
    if (!api) {
      setLoadError('Ejecuta la app con Electron (npm run dev:electron).');
      setLoading(false);
      return;
    }

    let cancelled = false;
    void (async () => {
      try {
        const v = await api.getById(id);
        if (cancelled) return;
        if (!v) {
          setLoadError('Venta no encontrada.');
          setVenta(null);
        } else {
          setVenta(v);
          setLoadError(null);
        }
      } catch (e) {
        if (!cancelled) setLoadError((e as Error).message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [id]);

  const handleAnular = async () => {
    if (!venta || venta.estado !== 'ACTIVA') return;
    const ok = window.confirm(
      '¿Anular esta venta? Se devolverá el stock y la venta quedará como anulada. Esta acción no borra el registro.',
    );
    if (!ok) return;
    setAnulando(true);
    try {
      const success = await anularVenta(venta.id);
      if (success) {
        const api = window.api?.venta;
        if (api) {
          const v = await api.getById(venta.id);
          if (v) setVenta(v);
        }
      }
    } finally {
      setAnulando(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div
          className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent"
          aria-hidden
        />
      </div>
    );
  }

  if (loadError || !venta) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" className="gap-2" asChild>
          <Link to="/ventas">
            <ArrowLeft className="h-4 w-4" />
            Volver a ventas
          </Link>
        </Button>
        <Alert variant="destructive">
          <AlertDescription>{loadError ?? 'No encontrada.'}</AlertDescription>
        </Alert>
      </div>
    );
  }

  const v = venta;

  return (
    <div className="space-y-6">
      <VentaEditorDialog
        open={editOpen}
        onClose={() => setEditOpen(false)}
        mode="edit"
        venta={v}
        onSuccess={async () => {
          const api = window.api?.venta;
          if (api) {
            const fresh = await api.getById(v.id);
            if (fresh) setVenta(fresh);
          }
        }}
      />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button variant="ghost" size="sm" className="gap-2" asChild>
          <Link to="/ventas">
            <ArrowLeft className="h-4 w-4" />
            Ventas
          </Link>
        </Button>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="secondary"
            className="gap-2"
            onClick={() => openVentaTicketPrintWindow(v.id)}
          >
            <Printer className="h-4 w-4" />
            Imprimir ticket
          </Button>
          {v.estado === 'ACTIVA' ? (
            <>
              <Button type="button" variant="outline" className="gap-2" onClick={() => setEditOpen(true)}>
                <Pencil className="h-4 w-4" />
                Editar venta
              </Button>
              <Button
                type="button"
                variant="destructive"
                className="gap-2"
                disabled={anulando}
                onClick={() => void handleAnular()}
              >
                <Ban className="h-4 w-4" />
                {anulando ? 'Anulando…' : 'Anular venta'}
              </Button>
            </>
          ) : null}
        </div>
      </div>

      <div>
        <h2 className="text-xl font-semibold tracking-tight">Venta #{v.id}</h2>
        <p className="text-sm text-muted-foreground">{formatFecha(v.fecha)}</p>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Resumen</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-2 text-sm sm:grid-cols-2">
          <div>
            <span className="text-muted-foreground">Total</span>
            <p className="text-lg font-semibold">${v.total.toFixed(2)}</p>
          </div>
          <div>
            <span className="text-muted-foreground">Método de pago</span>
            <p className="font-medium">{metodoLabel(v.metodoPago)}</p>
          </div>
          <div>
            <span className="text-muted-foreground">Estado</span>
            <p className="font-medium">{v.estado === 'ANULADA' ? 'Anulada' : 'Activa'}</p>
          </div>
          <div>
            <span className="text-muted-foreground">Folio en ticket</span>
            <p className="font-mono">{v.ticketFolio ?? '—'}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              El identificador interno de la venta es #{v.id}. El folio es lo que muestras en comprobantes; si lo
              dejas vacío al registrar, ahora se guarda automáticamente como{' '}
              <span className="font-mono">V-{v.id}</span>.
              {v.ticketFolio == null
                ? ' Esta venta no tiene folio en base (p. ej. creada antes de ese comportamiento).'
                : null}
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Productos</CardTitle>
        </CardHeader>
        <CardContent className="p-0 sm:px-6 sm:pb-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>SKU</TableHead>
                <TableHead>Producto</TableHead>
                <TableHead className="text-right">Cant.</TableHead>
                <TableHead className="text-right">P. unit.</TableHead>
                <TableHead className="text-right">Subtotal</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {v.detalles.map((d) => (
                <TableRow key={d.id}>
                  <TableCell className="font-mono text-muted-foreground">{d.productoSku}</TableCell>
                  <TableCell>{d.productoNombre}</TableCell>
                  <TableCell className="text-right">{d.cantidad}</TableCell>
                  <TableCell className="text-right">${d.precioAplicado.toFixed(2)}</TableCell>
                  <TableCell className="text-right font-medium">
                    ${(d.cantidad * d.precioAplicado).toFixed(2)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground">
        Costo histórico por unidad (referencia interna):{' '}
        {v.detalles.map((d) => `${d.productoSku}: $${d.precioCostoUnitarioHistorico.toFixed(2)}`).join(' · ')}
      </p>
    </div>
  );
}
