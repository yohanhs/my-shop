import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';

import { localFileToImgSrc } from '@/lib/localImageSrc';
import type { Configuracion, VentaConDetalles } from '@/types/electron';

function formatMoney(amount: number, moneda: string): string {
  try {
    return new Intl.NumberFormat('es-MX', { style: 'currency', currency: moneda || 'MXN' }).format(amount);
  } catch {
    return `$${amount.toFixed(2)}`;
  }
}

function formatFechaTicket(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return new Intl.DateTimeFormat('es-MX', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(d);
}

function metodoLabel(m: string): string {
  switch (m) {
    case 'EFECTIVO':
      return 'EFECTIVO';
    case 'TARJETA':
      return 'TARJETA';
    case 'TRANSFERENCIA':
      return 'TRANSFERENCIA';
    default:
      return m;
  }
}

function truncate(s: string, max: number): string {
  const t = s.trim();
  return t.length <= max ? t : `${t.slice(0, max - 1)}…`;
}

/** Asume precio de venta con IVA incluido (habitual en MX); solo informativo en el ticket. */
function ivaDesglose(total: number, pct: number): { base: number; iva: number } | null {
  if (!Number.isFinite(pct) || pct <= 0) return null;
  const factor = 1 + pct / 100;
  const base = total / factor;
  const iva = total - base;
  return { base, iva };
}

const ticketStyles = `
  @media print {
    @page { size: 80mm auto; margin: 3mm; }
    html, body { background: #fff !important; }
    .no-print { display: none !important; }
    .ticket-wrap { box-shadow: none !important; border: none !important; margin: 0 !important; padding: 0 !important; }
  }
  .ticket-wrap {
    box-sizing: border-box;
    width: 72mm;
    max-width: 100%;
    margin: 0 auto;
    padding: 10px 8px 16px;
    font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
    font-size: 11px;
    line-height: 1.35;
    color: #111;
    background: #fff;
  }
  .ticket-hr {
    border: none;
    border-top: 1px dashed #333;
    margin: 8px 0;
  }
  .ticket-title {
    text-align: center;
    font-weight: 700;
    font-size: 13px;
    letter-spacing: 0.02em;
    text-transform: uppercase;
  }
  .ticket-sub {
    text-align: center;
    font-size: 10px;
    color: #444;
    margin-top: 2px;
  }
  .ticket-row {
    display: flex;
    justify-content: space-between;
    gap: 6px;
    margin: 2px 0;
  }
  .ticket-line-name {
    margin-top: 6px;
    font-weight: 600;
    word-break: break-word;
  }
  .ticket-line-detail {
    display: flex;
    justify-content: space-between;
    font-size: 10px;
    color: #333;
    margin-top: 1px;
  }
  .ticket-total {
    margin-top: 8px;
    padding-top: 6px;
    border-top: 2px solid #111;
    font-weight: 800;
    font-size: 12px;
    display: flex;
    justify-content: space-between;
  }
  .ticket-anulada {
    margin: 10px 0;
    padding: 8px;
    border: 2px solid #000;
    text-align: center;
    font-weight: 800;
    font-size: 11px;
    text-transform: uppercase;
  }
`;

export function VentaPrintTicketPage() {
  const { id: idParam } = useParams();
  const id = idParam ? Number.parseInt(idParam, 10) : Number.NaN;

  const [venta, setVenta] = useState<VentaConDetalles | null>(null);
  const [config, setConfig] = useState<Configuracion | null>(null);
  const [error, setError] = useState<string | null>(null);
  const autoPrintDoneRef = useRef(false);

  useEffect(() => {
    if (!Number.isFinite(id) || id < 1) {
      setError('Venta no válida.');
      return;
    }
    const vApi = window.api?.venta;
    const cApi = window.api?.configuracion;
    if (!vApi || !cApi) {
      setError('Abre esta vista desde la app de escritorio.');
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const [v, c] = await Promise.all([vApi.getById(id), cApi.get()]);
        if (cancelled) return;
        if (!v) {
          setError('Venta no encontrada.');
          return;
        }
        setVenta(v);
        setConfig(c);
        setError(null);
      } catch (e) {
        if (!cancelled) setError((e as Error).message);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  const logoHref = config?.logoPath ? localFileToImgSrc(config.logoPath) ?? null : null;

  const subtotalLineas = useMemo(() => {
    if (!venta) return 0;
    return venta.detalles.reduce((s, d) => s + d.cantidad * d.precioAplicado, 0);
  }, [venta]);

  const ivaInfo = useMemo(() => {
    if (!venta || !config) return null;
    return ivaDesglose(venta.total, config.impuestoPorcentaje);
  }, [venta, config]);

  useEffect(() => {
    if (!venta || !config || error) return;
    if (autoPrintDoneRef.current) return;
    autoPrintDoneRef.current = true;
    const t = window.setTimeout(() => window.print(), 400);
    return () => window.clearTimeout(t);
  }, [venta, config, error]);

  if (error) {
    return (
      <div className="p-6 font-sans text-sm text-red-700">
        <p>{error}</p>
        <button type="button" className="no-print mt-4 text-primary underline" onClick={() => window.close()}>
          Cerrar ventana
        </button>
      </div>
    );
  }

  if (!venta || !config) {
    return (
      <div className="flex min-h-[200px] items-center justify-center font-sans text-sm text-muted-foreground">
        Cargando ticket…
      </div>
    );
  }

  const v = venta;
  const moneda = config.moneda || 'MXN';
  const folio = v.ticketFolio?.trim() || `V-${v.id}`;
  const anulada = v.estado === 'ANULADA';

  return (
    <>
      <style>{ticketStyles}</style>
      <div className="no-print flex justify-center gap-2 border-b bg-muted/40 p-3 font-sans print:hidden">
        <button
          type="button"
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
          onClick={() => window.print()}
        >
          Imprimir de nuevo
        </button>
        <button type="button" className="rounded-md border px-4 py-2 text-sm hover:bg-muted" onClick={() => window.close()}>
          Cerrar
        </button>
      </div>

      <div className="ticket-wrap">
        {logoHref ? (
          <div style={{ textAlign: 'center', marginBottom: 8 }}>
            <img src={logoHref} alt="Logo" style={{ maxHeight: 48, maxWidth: '100%', objectFit: 'contain' }} />
          </div>
        ) : null}

        <div className="ticket-title">{config.nombreTienda}</div>
        <div className="ticket-sub">Ticket de venta</div>

        <hr className="ticket-hr" />

        <div className="ticket-row">
          <span>Folio</span>
          <span style={{ fontWeight: 700 }}>{folio}</span>
        </div>
        <div className="ticket-row">
          <span>Fecha</span>
          <span>{formatFechaTicket(v.fecha)}</span>
        </div>
        <div className="ticket-row">
          <span>Pago</span>
          <span>{metodoLabel(v.metodoPago)}</span>
        </div>

        {anulada ? <div className="ticket-anulada">Venta anulada — documento sin valor fiscal</div> : null}

        <hr className="ticket-hr" />

        {v.detalles.map((d) => {
          const lineTotal = d.cantidad * d.precioAplicado;
          return (
            <div key={d.id}>
              <div className="ticket-line-name">{truncate(d.productoNombre, 32)}</div>
              <div className="ticket-line-detail">
                <span>
                  {d.cantidad} × {formatMoney(d.precioAplicado, moneda)}
                </span>
                <span>{formatMoney(lineTotal, moneda)}</span>
              </div>
              <div style={{ fontSize: 9, color: '#666', marginTop: 1 }}>SKU {d.productoSku}</div>
            </div>
          );
        })}

        <hr className="ticket-hr" />

        {ivaInfo && config.impuestoPorcentaje > 0 ? (
          <>
            <div className="ticket-row" style={{ fontSize: 10 }}>
              <span>Subtotal (base)</span>
              <span>{formatMoney(ivaInfo.base, moneda)}</span>
            </div>
            <div className="ticket-row" style={{ fontSize: 10 }}>
              <span>IVA ({config.impuestoPorcentaje}%)</span>
              <span>{formatMoney(ivaInfo.iva, moneda)}</span>
            </div>
          </>
        ) : null}

        <div className="ticket-row" style={{ fontSize: 10, color: '#444' }}>
          <span>Suma productos</span>
          <span>{formatMoney(subtotalLineas, moneda)}</span>
        </div>

        <div className="ticket-total">
          <span>TOTAL</span>
          <span>{formatMoney(v.total, moneda)}</span>
        </div>

        <p style={{ marginTop: 10, textAlign: 'center', fontSize: 9, color: '#555' }}>
          Precios {config.impuestoPorcentaje > 0 ? `incluyen IVA (${config.impuestoPorcentaje}%)` : 'mostrados'} ·{' '}
          {moneda}
        </p>

        <hr className="ticket-hr" />

        <p style={{ textAlign: 'center', fontSize: 10, fontWeight: 600 }}>¡Gracias por su compra!</p>
        <p style={{ textAlign: 'center', fontSize: 9, color: '#666', marginTop: 4 }}>Conserve este comprobante</p>
      </div>
    </>
  );
}
