import { useEffect, useState, type ReactNode } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Pencil } from 'lucide-react';

import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { Producto } from '@/types/electron';

function formatFecha(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return new Intl.DateTimeFormat('es-MX', {
    dateStyle: 'long',
    timeStyle: 'short',
  }).format(d);
}

function formatSoloFecha(iso: string | null | undefined): { texto: string; vencido: boolean } {
  if (!iso) return { texto: 'Sin caducidad', vencido: false };
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return { texto: iso, vencido: false };
  const inicioHoy = new Date();
  inicioHoy.setHours(0, 0, 0, 0);
  const inicioCad = new Date(d);
  inicioCad.setHours(0, 0, 0, 0);
  return {
    texto: new Intl.DateTimeFormat('es-MX', { dateStyle: 'long' }).format(d),
    vencido: inicioCad < inicioHoy,
  };
}

function DetalleCampo({ etiqueta, children }: { etiqueta: string; children: ReactNode }) {
  return (
    <div className="space-y-1">
      <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{etiqueta}</dt>
      <dd className="text-sm text-foreground">{children}</dd>
    </div>
  );
}

export function ProductoDetallePage() {
  const navigate = useNavigate();
  const { id: idParam } = useParams<{ id: string }>();
  const [producto, setProducto] = useState<Producto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const id = Number(idParam);
    if (!Number.isInteger(id) || id < 1) {
      setError('Identificador de producto no válido.');
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    void (async () => {
      try {
        const api = typeof window !== 'undefined' ? window.api?.producto : undefined;
        if (!api) {
          if (!cancelled) setError('La app debe ejecutarse dentro de Electron.');
          return;
        }
        const p = await api.getById(id);
        if (cancelled) return;
        if (!p) {
          setError('No se encontró el producto.');
          setProducto(null);
        } else {
          setProducto(p);
        }
      } catch (err) {
        if (!cancelled) setError((err as Error).message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [idParam]);

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <div
          className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent"
          aria-hidden
        />
      </div>
    );
  }

  if (error || !producto) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" className="gap-2 px-0" asChild>
          <Link to="/productos">
            <ArrowLeft className="h-4 w-4" />
            Volver a productos
          </Link>
        </Button>
        <Alert variant="destructive">
          <AlertDescription>{error ?? 'Producto no encontrado.'}</AlertDescription>
        </Alert>
      </div>
    );
  }

  const p = producto;
  const activo = p.status === 'ACTIVE';
  const cad = formatSoloFecha(p.fechaCaducidad);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-4">
        <Button variant="ghost" size="sm" className="gap-2 px-0" asChild>
          <Link to="/productos">
            <ArrowLeft className="h-4 w-4" />
            Volver
          </Link>
        </Button>
        <div className="min-w-0 flex-1">
          <h2 className="text-2xl font-semibold tracking-tight">{p.nombre}</h2>
          <p className="text-sm text-muted-foreground font-mono">{p.sku}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={
              activo
                ? 'inline-flex rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-800'
                : 'inline-flex rounded-full bg-red-100 px-3 py-1 text-xs font-semibold text-red-800'
            }
          >
            {activo ? 'Activo' : 'Inactivo'}
          </span>
          <Button
            type="button"
            className="gap-2"
            onClick={() => navigate('/productos', { state: { editProductId: p.id } })}
          >
            <Pencil className="h-4 w-4" />
            Editar
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Datos del producto</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid gap-6 sm:grid-cols-2">
            <DetalleCampo etiqueta="Precio costo">${p.precioCosto.toFixed(2)}</DetalleCampo>
            <DetalleCampo etiqueta="Precio venta">${p.precioVenta.toFixed(2)}</DetalleCampo>
            <DetalleCampo etiqueta="Stock actual">
              <span className={p.stockActual <= p.stockMinimo ? 'font-semibold text-destructive' : undefined}>
                {p.stockActual}
              </span>
            </DetalleCampo>
            <DetalleCampo etiqueta="Stock mínimo">{p.stockMinimo}</DetalleCampo>
            <DetalleCampo etiqueta="Caducidad">
              {p.fechaCaducidad ? (
                <span className={cad.vencido ? 'font-semibold text-destructive' : undefined}>{cad.texto}</span>
              ) : (
                <span className="text-muted-foreground">{cad.texto}</span>
              )}
              {cad.vencido ? (
                <span className="mt-1 block text-xs text-destructive">Fecha vencida</span>
              ) : null}
            </DetalleCampo>
            <div className="sm:col-span-2">
              <DetalleCampo etiqueta="Descripción">
                {p.descripcion ? (
                  <p className="whitespace-pre-wrap text-sm leading-relaxed">{p.descripcion}</p>
                ) : (
                  <span className="text-muted-foreground">Sin descripción</span>
                )}
              </DetalleCampo>
            </div>
            <div className="sm:col-span-2">
              <DetalleCampo etiqueta="Ruta de imagen">
                {p.imagenPath ? (
                  <code className="block rounded-md bg-muted px-2 py-1.5 text-xs">{p.imagenPath}</code>
                ) : (
                  <span className="text-muted-foreground">—</span>
                )}
              </DetalleCampo>
            </div>
            <DetalleCampo etiqueta="Creado">{formatFecha(p.createdAt)}</DetalleCampo>
            <DetalleCampo etiqueta="Última actualización">{formatFecha(p.updatedAt)}</DetalleCampo>
          </dl>
        </CardContent>
      </Card>

      <p className="text-center text-xs text-muted-foreground">
        Vista de solo lectura. Usa «Editar» arriba o el ícono de lápiz en la lista para modificar.
      </p>
    </div>
  );
}
