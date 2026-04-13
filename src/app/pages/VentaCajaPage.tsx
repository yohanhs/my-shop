import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { Minus, Plus, X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { localFileToImgSrc } from '@/lib/localImageSrc';
import { openVentaTicketPrintWindow } from '@/lib/ventaTicketPrint';
import { cn } from '@/lib/utils';
import { loadProductosParaVenta, useVentaStore } from '@/store/useVentaStore';
import type { Producto, VentaCreateInput, VentaMetodoPago } from '@/types/electron';

function parseMontoInput(raw: string): number {
  const t = raw.trim().replace(',', '.');
  if (t === '') return Number.NaN;
  const n = Number.parseFloat(t);
  return Number.isFinite(n) ? n : Number.NaN;
}

type CartLine = { productoId: number; cantidad: number };

/** Productos mostrados en la grilla (búsqueda filtra dentro de este límite). */
const MAX_PRODUCTOS_GRILLA = 48;

/** Billetes MXN habituales en caja. */
const BILLETE_DOMINACIONES = [20, 50, 100, 200, 1000, 2000, 5000] as const;
type BilleteDenom = (typeof BILLETE_DOMINACIONES)[number];

type RecibidoModo = 'manual' | 'denominaciones';

function billetesIniciales(): Record<BilleteDenom, number> {
  return Object.fromEntries(BILLETE_DOMINACIONES.map((d) => [d, 0])) as Record<BilleteDenom, number>;
}

export function VentaCajaPage() {
  const createVenta = useVentaStore((s) => s.createVenta);
  const [productos, setProductos] = useState<Producto[]>([]);
  const [loadingProductos, setLoadingProductos] = useState(true);
  const [query, setQuery] = useState('');
  const [pickIdx, setPickIdx] = useState(0);
  const [lineas, setLineas] = useState<CartLine[]>([]);
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [metodoPago, setMetodoPago] = useState<VentaMetodoPago>('EFECTIVO');
  const [recibidoModo, setRecibidoModo] = useState<RecibidoModo>('manual');
  const [recibido, setRecibido] = useState('');
  const [billetes, setBilletes] = useState<Record<BilleteDenom, number>>(() => billetesIniciales());
  const [submitting, setSubmitting] = useState(false);
  const [printOffer, setPrintOffer] = useState<{ ventaId: number } | null>(null);

  const searchRef = useRef<HTMLInputElement>(null);
  const recibidoRef = useRef<HTMLInputElement>(null);
  const qtyRefs = useRef<(HTMLInputElement | null)[]>([]);
  /** Tras añadir al carrito se limpia la búsqueda; con esto el borde de selección sigue en el mismo producto. */
  const mantenerSeleccionProductoIdRef = useRef<number | null>(null);
  const blockHotkeys = printOffer != null || submitting;

  const byId = useMemo(() => new Map(productos.map((p) => [p.id, p])), [productos]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const base = productos.filter((p) => p.status === 'ACTIVE');
    if (!q) return base.slice(0, MAX_PRODUCTOS_GRILLA);
    return base
      .filter((p) => p.nombre.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q))
      .slice(0, MAX_PRODUCTOS_GRILLA);
  }, [productos, query]);

  useEffect(() => {
    const id = mantenerSeleccionProductoIdRef.current;
    if (id != null) {
      const idx = filtered.findIndex((x) => x.id === id);
      if (idx >= 0) setPickIdx(idx);
      else setPickIdx(0);
      mantenerSeleccionProductoIdRef.current = null;
      return;
    }
    setPickIdx(0);
  }, [query, filtered]);

  const total = useMemo(() => {
    let t = 0;
    for (const l of lineas) {
      const p = byId.get(l.productoId);
      if (p) t += l.cantidad * p.precioVenta;
    }
    return t;
  }, [lineas, byId]);

  const recibidoEfectivoNum = useMemo(() => {
    if (metodoPago !== 'EFECTIVO') return Number.NaN;
    if (recibidoModo === 'manual') return parseMontoInput(recibido);
    return BILLETE_DOMINACIONES.reduce((acc, v) => acc + v * (billetes[v] ?? 0), 0);
  }, [metodoPago, recibidoModo, recibido, billetes]);

  const vueltoEfectivo =
    metodoPago === 'EFECTIVO' && Number.isFinite(recibidoEfectivoNum)
      ? Math.max(0, recibidoEfectivoNum - total)
      : null;
  const faltaEfectivo =
    metodoPago === 'EFECTIVO' &&
    Number.isFinite(recibidoEfectivoNum) &&
    recibidoEfectivoNum + 0.0001 < total;

  const reloadProductos = useCallback(() => {
    setLoadingProductos(true);
    void loadProductosParaVenta()
      .then(setProductos)
      .finally(() => setLoadingProductos(false));
  }, []);

  useEffect(() => {
    reloadProductos();
  }, [reloadProductos]);

  const addProduct = useCallback(
    (p: Producto) => {
      if (p.stockActual < 1) return;
      setLineas((prev) => {
        const i = prev.findIndex((l) => l.productoId === p.id);
        if (i >= 0) {
          const next = [...prev];
          const maxQ = p.stockActual;
          next[i] = { ...next[i], cantidad: Math.min(maxQ, next[i].cantidad + 1) };
          setSelectedIdx(i);
          return next;
        }
        setSelectedIdx(prev.length);
        return [...prev, { productoId: p.id, cantidad: 1 }];
      });
      mantenerSeleccionProductoIdRef.current = p.id;
      setQuery('');
      requestAnimationFrame(() => searchRef.current?.focus());
    },
    [],
  );

  const setQty = useCallback((index: number, cantidad: number) => {
    setLineas((prev) => {
      const row = prev[index];
      if (!row) return prev;
      const p = byId.get(row.productoId);
      const max = p?.stockActual ?? cantidad;
      const q = Math.max(1, Math.min(max, Math.floor(cantidad)));
      const next = [...prev];
      next[index] = { ...row, cantidad: q };
      return next;
    });
  }, [byId]);

  const bumpQty = useCallback(
    (index: number, delta: number) => {
      const row = lineas[index];
      if (!row) return;
      setQty(index, row.cantidad + delta);
    },
    [lineas, setQty],
  );

  const removeLine = useCallback(
    (index: number) => {
      setLineas((prev) => {
        if (prev.length <= 1) return [];
        const next = prev.filter((_, i) => i !== index);
        setSelectedIdx((s) => {
          if (next.length === 0) return 0;
          if (index < s) return s - 1;
          if (s >= next.length) return next.length - 1;
          return s;
        });
        return next;
      });
    },
    [setLineas],
  );

  const resetCaja = useCallback(() => {
    setLineas([]);
    setSelectedIdx(0);
    setPickIdx(0);
    setRecibido('');
    setBilletes(billetesIniciales());
    setMetodoPago('EFECTIVO');
    setQuery('');
    reloadProductos();
    requestAnimationFrame(() => searchRef.current?.focus());
  }, [reloadProductos]);

  const setBilleteCantidad = useCallback((valor: BilleteDenom, raw: string) => {
    const n = raw === '' ? 0 : Number.parseInt(raw, 10);
    const pcs = Number.isFinite(n) && n >= 0 ? Math.min(9999, n) : 0;
    setBilletes((prev) => ({ ...prev, [valor]: pcs }));
  }, []);

  const finalize = useCallback(async () => {
    if (blockHotkeys) return;
    if (lineas.length === 0) {
      toast.message('Carrito vacío', { description: 'Agrega al menos un producto antes de cobrar.' });
      return;
    }
    for (let i = 0; i < lineas.length; i += 1) {
      const l = lineas[i];
      const p = byId.get(l.productoId);
      if (!p || l.cantidad > p.stockActual) {
        toast.error('No se puede cobrar', {
          description: p
            ? `«${p.nombre}»: máximo ${p.stockActual} uds. en stock.`
            : 'Hay un producto inválido en el carrito.',
        });
        return;
      }
    }
    if (metodoPago === 'EFECTIVO') {
      if (!Number.isFinite(recibidoEfectivoNum) || recibidoEfectivoNum < total - 0.001) {
        toast.error('Efectivo insuficiente', {
          description:
            recibidoModo === 'manual'
              ? 'Indica en «Recibido» un monto que cubra el total.'
              : 'Ajusta las cantidades por billete hasta cubrir el total.',
        });
        return;
      }
    }

    const payload: VentaCreateInput = {
      metodoPago,
      ticketFolio: null,
      lineas: lineas.map((l) => ({ productoId: l.productoId, cantidad: l.cantidad })),
    };

    setSubmitting(true);
    try {
      const created = await createVenta(payload);
      if (created) {
        resetCaja();
        setPrintOffer({ ventaId: created.id });
      }
    } finally {
      setSubmitting(false);
    }
  }, [
    blockHotkeys,
    lineas,
    byId,
    metodoPago,
    recibidoEfectivoNum,
    recibidoModo,
    total,
    createVenta,
    resetCaja,
  ]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (blockHotkeys) return;
      const k = e.key;
      if (!k.startsWith('F')) return;
      if (k === 'F1') {
        e.preventDefault();
        searchRef.current?.focus();
        return;
      }
      if (k === 'F2') {
        e.preventDefault();
        if (lineas.length > 0) {
          const i = Math.min(selectedIdx, lineas.length - 1);
          qtyRefs.current[i]?.focus();
        }
        return;
      }
      if (k === 'F5') {
        e.preventDefault();
        if (lineas.length > 0) removeLine(Math.min(selectedIdx, lineas.length - 1));
        return;
      }
      if (k === 'F10') {
        e.preventDefault();
        setMetodoPago('EFECTIVO');
        requestAnimationFrame(() => recibidoRef.current?.focus());
        return;
      }
      if (k === 'F11') {
        e.preventDefault();
        setMetodoPago('TARJETA');
        return;
      }
      if (k === 'F12') {
        e.preventDefault();
        void finalize();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [blockHotkeys, finalize, lineas.length, removeLine, selectedIdx]);

  const onSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (filtered.length === 0) return;
      setPickIdx((i) => Math.min(filtered.length - 1, i + 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (filtered.length === 0) return;
      setPickIdx((i) => Math.max(0, i - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const p = filtered[pickIdx] ?? filtered[0];
      if (p) addProduct(p);
    }
  };

  const legend = (
    <div className="flex flex-wrap justify-center gap-1.5 border-t border-border pt-2.5 text-[10px] text-muted-foreground sm:justify-start sm:gap-2 sm:pt-3 sm:text-[11px]">
      <span className="rounded-md bg-blue-600/15 px-2 py-1 font-medium text-blue-700 dark:text-blue-300">
        F1 Buscar
      </span>
      <span className="rounded-md bg-teal-600/15 px-2 py-1 font-medium text-teal-800 dark:text-teal-300">
        F2 Cantidad
      </span>
      <span className="rounded-md bg-red-600/15 px-2 py-1 font-medium text-red-800 dark:text-red-300">
        F5 Quitar línea
      </span>
      <span className="rounded-md bg-amber-600/15 px-2 py-1 font-medium text-amber-900 dark:text-amber-200">
        F10 Efectivo
      </span>
      <span className="rounded-md bg-violet-600/15 px-2 py-1 font-medium text-violet-800 dark:text-violet-300">
        F11 Tarjeta
      </span>
      <span className="rounded-md bg-emerald-600/15 px-2 py-1 font-medium text-emerald-800 dark:text-emerald-300">
        F12 Finalizar
      </span>
    </div>
  );

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3 px-3 py-3 sm:gap-4 sm:px-4 sm:py-4 lg:px-6 lg:py-5">
      <div className="mx-auto flex w-full min-w-0 max-w-[1920px] min-h-0 flex-1 flex-col gap-3 sm:gap-4">
        <div className="shrink-0 space-y-1">
          <h2 className="text-lg font-semibold tracking-tight sm:text-xl">Caja (venta rápida)</h2>
          <p className="text-xs text-muted-foreground sm:text-sm">
            Atajos de teclado para cobrar con agilidad. También puedes usar{' '}
            <Link to="/ventas" className="text-primary underline-offset-4 hover:underline">
              Ventas
            </Link>{' '}
            para el registro detallado.
          </p>
        </div>

        <div className="grid min-h-0 w-full min-w-0 flex-1 grid-cols-1 content-stretch gap-3 sm:gap-4 lg:grid-cols-[minmax(0,1fr)_20rem] lg:gap-5 xl:grid-cols-[minmax(0,1fr)_24rem] 2xl:grid-cols-[minmax(0,1fr)_26rem]">
        <div className="flex h-full min-h-0 flex-col gap-3 rounded-xl border border-border/80 bg-card/80 p-3 shadow-sm backdrop-blur-xl supports-[backdrop-filter]:bg-card/70 sm:gap-4 sm:p-4">
          <Label htmlFor="caja-buscar" className="text-sm font-semibold">
            Buscar producto (F1)
          </Label>
          <Input
            id="caja-buscar"
            ref={searchRef}
            autoComplete="off"
            placeholder="Nombre o SKU…"
            value={query}
            disabled={loadingProductos}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onSearchKeyDown}
            className="h-11 border-2 text-base shadow-sm"
          />

          <div
            className="min-h-0 flex-1 overflow-auto rounded-xl border border-border/70 bg-muted/20 p-2 backdrop-blur-md sm:p-3 dark:bg-muted/15"
            role="listbox"
            aria-label="Productos disponibles"
          >
            {loadingProductos ? (
              <p className="p-6 text-center text-sm text-muted-foreground">Cargando catálogo…</p>
            ) : filtered.length === 0 ? (
              <p className="p-6 text-center text-sm text-muted-foreground">
                {query.trim() ? 'Sin coincidencias.' : 'Sin productos con stock.'}
              </p>
            ) : (
              <div
                className={cn(
                  'grid min-w-0 gap-3',
                  /* Evita una sola tarjeta a ancho completo: mín. 2 columnas; más columnas en pantallas anchas */
                  'grid-cols-2 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5',
                )}
              >
                {filtered.map((p, i) => (
                  <div
                    key={p.id}
                    role="option"
                    aria-selected={i === pickIdx}
                    onMouseEnter={() => setPickIdx(i)}
                    onClick={() => {
                      if (p.stockActual >= 1) addProduct(p);
                    }}
                    onKeyDown={(e) => {
                      if (p.stockActual < 1) return;
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        addProduct(p);
                      }
                    }}
                    tabIndex={p.stockActual < 1 ? -1 : 0}
                    className={cn(
                      'flex min-w-0 flex-col overflow-hidden rounded-xl border border-border/80 bg-background/85 shadow-sm backdrop-blur-md transition-[box-shadow,border-color] outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 supports-[backdrop-filter]:bg-background/75',
                      p.stockActual >= 1
                        ? 'cursor-pointer hover:shadow-md'
                        : 'cursor-not-allowed opacity-70',
                      i === pickIdx
                        ? 'z-[1] border-blue-600 ring-2 ring-blue-500/50 ring-offset-2 ring-offset-background dark:border-blue-500 dark:ring-blue-400/40'
                        : 'border-border hover:border-primary/30',
                    )}
                  >
                    <div className="relative aspect-[4/3] w-full shrink-0 overflow-hidden bg-muted">
                      {p.imagenPath ? (
                        <img
                          src={localFileToImgSrc(p.imagenPath)}
                          alt=""
                          className="size-full object-cover"
                        />
                      ) : (
                        <div className="flex size-full items-center justify-center text-2xl text-muted-foreground/50">
                          —
                        </div>
                      )}
                    </div>
                    <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-2 p-2.5 sm:p-3">
                      <p className="line-clamp-2 text-sm font-semibold leading-snug">{p.nombre}</p>
                      <p className="text-xs text-muted-foreground tabular-nums">
                        ${p.precioVenta.toFixed(2)} · stock {p.stockActual}
                      </p>
                      <Button
                        type="button"
                        variant="secondary"
                        tabIndex={-1}
                        disabled={p.stockActual < 1}
                        className="pointer-events-none mt-auto flex h-auto min-h-10 w-full flex-col items-center justify-center gap-0.5 border-0 bg-sky-500/15 px-2 py-2 text-sm font-semibold leading-tight text-sky-900 shadow-none sm:flex-row sm:gap-1.5 dark:bg-sky-400/15 dark:text-sky-50"
                      >
                        <Plus className="h-4 w-4 shrink-0" aria-hidden />
                        <span className="whitespace-nowrap">Añadir</span>
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex min-h-[11rem] min-w-0 flex-1 flex-col rounded-xl border-2 border-border bg-muted/10 p-3 sm:min-h-[12rem] sm:p-4 md:min-h-[13rem]">
            <h3 className="mb-3 text-base font-bold tracking-tight">Carrito</h3>
            {lineas.length === 0 ? (
              <p className="text-sm text-muted-foreground">Agrega productos desde la búsqueda.</p>
            ) : (
              <div className="min-h-0 flex-1 space-y-3 overflow-auto pr-0.5">
                {lineas.map((line, index) => {
                  const p = byId.get(line.productoId);
                  if (!p) return null;
                  const lineTotal = line.cantidad * p.precioVenta;
                  const sel = index === selectedIdx;
                  return (
                    <div
                      key={`${line.productoId}-${index}`}
                      role="button"
                      tabIndex={0}
                      onClick={() => setSelectedIdx(index)}
                      onKeyDown={(ev) => {
                        if (ev.key === 'Enter' || ev.key === ' ') {
                          ev.preventDefault();
                          setSelectedIdx(index);
                        }
                      }}
                      className={cn(
                        'flex min-w-0 flex-nowrap items-center gap-3 rounded-xl border-2 bg-background p-3 text-sm shadow-sm transition-all sm:gap-4',
                        sel
                          ? 'border-cyan-400 bg-cyan-50/70 shadow-[0_0_0_3px_rgba(34,211,238,0.35)] dark:border-cyan-500 dark:bg-cyan-950/50 dark:shadow-[0_0_0_3px_rgba(6,182,212,0.25)]'
                          : 'border-slate-200 hover:border-slate-300 dark:border-border/90 dark:hover:border-muted-foreground/30',
                      )}
                    >
                      <div className="size-12 shrink-0 overflow-hidden rounded-lg border border-border bg-muted sm:size-14">
                        {p.imagenPath ? (
                          <img
                            src={localFileToImgSrc(p.imagenPath)}
                            alt=""
                            className="size-full object-cover"
                          />
                        ) : (
                          <div className="flex size-full items-center justify-center text-xs text-muted-foreground">
                            —
                          </div>
                        )}
                      </div>
                      <div className="min-w-0 flex-1 overflow-hidden">
                        <p className="truncate font-bold text-foreground">{p.nombre}</p>
                        <p className="mt-0.5 text-xs text-muted-foreground tabular-nums">
                          ${p.precioVenta.toFixed(2)} c/u
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-1.5">
                        <Button
                          type="button"
                          size="icon"
                          variant="default"
                          className="h-9 w-9 shrink-0 rounded-lg border-0 bg-blue-600 text-white shadow-sm hover:bg-blue-700 focus-visible:ring-blue-500"
                          aria-label="Menos"
                          onClick={(e) => {
                            e.stopPropagation();
                            bumpQty(index, -1);
                          }}
                        >
                          <Minus className="h-4 w-4 stroke-[2.5]" />
                        </Button>
                        <Input
                          ref={(el) => {
                            qtyRefs.current[index] = el;
                          }}
                          type="number"
                          min={1}
                          max={p.stockActual}
                          className="h-9 w-14 rounded-lg border-2 border-input bg-background text-center text-sm font-semibold tabular-nums shadow-inner"
                          value={line.cantidad}
                          onClick={(e) => e.stopPropagation()}
                          onChange={(e) => {
                            const n = Number.parseInt(e.target.value, 10);
                            if (Number.isFinite(n)) setQty(index, n);
                          }}
                          onBlur={() => {
                            const row = lineas[index];
                            if (row) setQty(index, row.cantidad);
                          }}
                        />
                        <Button
                          type="button"
                          size="icon"
                          variant="default"
                          className="h-9 w-9 shrink-0 rounded-lg border-0 bg-blue-600 text-white shadow-sm hover:bg-blue-700 focus-visible:ring-blue-500"
                          aria-label="Más"
                          onClick={(e) => {
                            e.stopPropagation();
                            bumpQty(index, 1);
                          }}
                        >
                          <Plus className="h-4 w-4 stroke-[2.5]" />
                        </Button>
                      </div>
                      <div className="shrink-0 rounded-xl bg-sky-100 px-3 py-2 text-sm font-bold tabular-nums text-sky-950 shadow-inner dark:bg-sky-950/50 dark:text-sky-50">
                        ${lineTotal.toFixed(2)}
                      </div>
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        className="h-9 w-9 shrink-0 rounded-lg text-red-600 hover:bg-red-50 hover:text-red-700 dark:text-red-500 dark:hover:bg-red-950/40 dark:hover:text-red-400"
                        aria-label="Quitar línea"
                        onClick={(e) => {
                          e.stopPropagation();
                          removeLine(index);
                        }}
                      >
                        <X className="h-5 w-5 stroke-[2.5]" />
                      </Button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
          {legend}
        </div>

        <div className="flex min-h-0 flex-col gap-4 rounded-xl border border-border/80 bg-card/80 p-3 shadow-md backdrop-blur-xl supports-[backdrop-filter]:bg-card/70 sm:gap-5 sm:p-4 lg:sticky lg:top-0 lg:max-h-[calc(100dvh-3.75rem)] lg:self-start lg:overflow-y-auto xl:max-h-[calc(100dvh-4.25rem)]">
          <div className="shrink-0 rounded-xl bg-slate-800 px-4 py-5 text-center text-white shadow-lg dark:bg-slate-950">
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-300 sm:text-xs">
              Total a pagar
            </p>
            <p className="mt-1 text-3xl font-bold tabular-nums tracking-tight sm:text-4xl">${total.toFixed(2)}</p>
          </div>

          <div className="min-w-0 space-y-3">
            {metodoPago === 'EFECTIVO' ? (
              <>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <Label htmlFor={recibidoModo === 'manual' ? 'caja-recibido' : undefined} className="text-base font-semibold">
                    Recibido
                  </Label>
                  <div
                    className="inline-flex rounded-lg border-2 border-border bg-muted/30 p-0.5 text-xs font-semibold"
                    role="group"
                    aria-label="Modo de monto recibido"
                  >
                    <button
                      type="button"
                      className={cn(
                        'rounded-md px-3 py-1.5 transition-colors',
                        recibidoModo === 'denominaciones'
                          ? 'bg-background text-foreground shadow-sm'
                          : 'text-muted-foreground hover:text-foreground',
                      )}
                      onClick={() => setRecibidoModo('denominaciones')}
                    >
                      Denominaciones
                    </button>
                    <button
                      type="button"
                      className={cn(
                        'rounded-md px-3 py-1.5 transition-colors',
                        recibidoModo === 'manual'
                          ? 'bg-background text-foreground shadow-sm'
                          : 'text-muted-foreground hover:text-foreground',
                      )}
                      onClick={() => {
                        setRecibidoModo('manual');
                        requestAnimationFrame(() => recibidoRef.current?.focus());
                      }}
                    >
                      Manual
                    </button>
                  </div>
                </div>
                {recibidoModo === 'manual' ? (
                  <Input
                    id="caja-recibido"
                    ref={recibidoRef}
                    inputMode="decimal"
                    autoComplete="off"
                    placeholder="0.00"
                    value={recibido}
                    onChange={(e) => setRecibido(e.target.value)}
                    className="h-12 border-2 text-lg tabular-nums shadow-inner"
                  />
                ) : (
                  <div className="space-y-2 rounded-xl border-2 border-border bg-muted/20 p-3">
                    <p className="text-[11px] font-medium text-muted-foreground">
                      Cantidad de billetes por denominación.
                    </p>
                    <div className="max-h-56 space-y-2 overflow-y-auto pr-0.5">
                      {BILLETE_DOMINACIONES.map((valor) => (
                        <div key={valor} className="flex items-center gap-2">
                          <span className="w-14 shrink-0 text-right text-sm font-medium tabular-nums">${valor}</span>
                          <Input
                            type="number"
                            inputMode="numeric"
                            min={0}
                            max={9999}
                            step={1}
                            aria-label={`Billetes de ${valor} pesos`}
                            className="h-9 text-center tabular-nums"
                            value={billetes[valor]}
                            onChange={(e) => setBilleteCantidad(valor, e.target.value)}
                          />
                        </div>
                      ))}
                    </div>
                    <div className="flex justify-between border-t border-border pt-2 text-sm">
                      <span className="text-muted-foreground">Suma recibida</span>
                      <span className="font-semibold tabular-nums">${recibidoEfectivoNum.toFixed(2)}</span>
                    </div>
                  </div>
                )}
              </>
            ) : null}
            {metodoPago === 'EFECTIVO' ? (
              <div className="flex items-baseline justify-between gap-3 border-t border-border pt-3">
                <span className="text-sm font-semibold text-muted-foreground">Vuelto</span>
                <span
                  className={cn(
                    'text-2xl font-bold tabular-nums sm:text-3xl',
                    faltaEfectivo ? 'text-destructive' : 'text-emerald-600 dark:text-emerald-400',
                  )}
                >
                  {vueltoEfectivo != null ? `$${vueltoEfectivo.toFixed(2)}` : '—'}
                </span>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">
                En tarjeta no aplica vuelto en caja. El total es el cobrado.
              </p>
            )}
            {faltaEfectivo ? (
              <p className="text-xs text-destructive">El monto recibido debe cubrir el total.</p>
            ) : null}
          </div>

          <div className="grid min-w-0 grid-cols-2 gap-2.5">
            <Button
              type="button"
              variant={metodoPago === 'EFECTIVO' ? 'default' : 'outline'}
              className={cn(
                'h-12 text-sm font-semibold shadow-sm sm:text-base',
                metodoPago !== 'EFECTIVO' && 'border-2 border-primary/40 bg-primary/5 text-primary hover:bg-primary/10',
              )}
              onClick={() => {
                setMetodoPago('EFECTIVO');
                recibidoRef.current?.focus();
              }}
            >
              Efectivo (F10)
            </Button>
            <Button
              type="button"
              variant={metodoPago === 'TARJETA' ? 'default' : 'outline'}
              className={cn(
                'h-12 text-sm font-semibold shadow-sm sm:text-base',
                metodoPago !== 'TARJETA' && 'border-2 border-primary/40 bg-primary/5 text-primary hover:bg-primary/10',
              )}
              onClick={() => setMetodoPago('TARJETA')}
            >
              Tarjeta (F11)
            </Button>
          </div>

          <Button
            type="button"
            className="mt-auto h-12 w-full shrink-0 rounded-xl bg-emerald-600 text-base font-bold text-white shadow-md hover:bg-emerald-700 sm:h-14 sm:text-lg"
            disabled={
              submitting ||
              lineas.length === 0 ||
              (metodoPago === 'EFECTIVO' &&
                (!Number.isFinite(recibidoEfectivoNum) || recibidoEfectivoNum + 0.001 < total))
            }
            onClick={() => void finalize()}
          >
            {submitting ? 'Guardando…' : 'Finalizar venta (F12)'}
          </Button>
        </div>
        </div>
      </div>

      <Dialog
        open={printOffer != null}
        onOpenChange={(o) => {
          if (!o) setPrintOffer(null);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Venta registrada</DialogTitle>
            <DialogDescription>
              ¿Deseas imprimir el ticket? Se abrirá la ventana de impresión como en el resto de la app (impresión
              automática al abrir).
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:justify-end">
            <Button type="button" variant="outline" onClick={() => setPrintOffer(null)}>
              No imprimir
            </Button>
            <Button
              type="button"
              onClick={() => {
                const id = printOffer?.ventaId;
                if (id != null) openVentaTicketPrintWindow(id);
                setPrintOffer(null);
              }}
            >
              Imprimir ticket
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
