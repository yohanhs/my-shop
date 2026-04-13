import { useEffect, useState } from "react";
import {
  endOfMonth,
  endOfWeek,
  endOfYear,
  format,
  startOfMonth,
  startOfWeek,
  startOfYear,
  subMonths,
  subWeeks,
} from "date-fns";
import { Loader2 } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { DatePickerField } from "@/components/ui/date-picker-field";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import type {
  HomeDashboardProductRank,
  HomeDashboardStats,
} from "@/types/electron";

/** Semana calendario lunes → domingo. */
const WEEK_MONDAY = { weekStartsOn: 1 as const };

function defaultDashboardMonthBounds(): { desde: string; hasta: string } {
  const now = new Date();
  const first = new Date(now.getFullYear(), now.getMonth(), 1);
  const last = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  return {
    desde: format(first, "yyyy-MM-dd"),
    hasta: format(last, "yyyy-MM-dd"),
  };
}

/** Días naturales inclusivos entre dos fechas `AAAA-MM-DD` (UTC medianoche). */
function inclusiveDayCountYmd(desde: string, hasta: string): number {
  const [ya, ma, da] = desde.split("-").map(Number);
  const [yb, mb, db] = hasta.split("-").map(Number);
  const a = Date.UTC(ya, ma - 1, da);
  const b = Date.UTC(yb, mb - 1, db);
  return Math.floor((b - a) / 86400000) + 1;
}

function rangeEstaSemana(): { desde: string; hasta: string } {
  const now = new Date();
  return {
    desde: format(startOfWeek(now, WEEK_MONDAY), "yyyy-MM-dd"),
    hasta: format(endOfWeek(now, WEEK_MONDAY), "yyyy-MM-dd"),
  };
}

function rangeSemanaPasada(): { desde: string; hasta: string } {
  const ref = subWeeks(new Date(), 1);
  return {
    desde: format(startOfWeek(ref, WEEK_MONDAY), "yyyy-MM-dd"),
    hasta: format(endOfWeek(ref, WEEK_MONDAY), "yyyy-MM-dd"),
  };
}

function rangeMesPasado(): { desde: string; hasta: string } {
  const ref = subMonths(new Date(), 1);
  return {
    desde: format(startOfMonth(ref), "yyyy-MM-dd"),
    hasta: format(endOfMonth(ref), "yyyy-MM-dd"),
  };
}

function rangeEsteAno(): { desde: string; hasta: string } {
  const now = new Date();
  return {
    desde: format(startOfYear(now), "yyyy-MM-dd"),
    hasta: format(endOfYear(now), "yyyy-MM-dd"),
  };
}

function HomeDashboardRangeToolbar({
  desde,
  hasta,
  onDesdeChange,
  onHastaChange,
  onApplyRange,
  fetching,
  disableFields,
  disablePresets,
}: {
  desde: string;
  hasta: string;
  onDesdeChange: (v: string) => void;
  onHastaChange: (v: string) => void;
  onApplyRange: (r: { desde: string; hasta: string }) => void;
  fetching: boolean;
  disableFields?: boolean;
  disablePresets?: boolean;
}) {
  const presetsOff = disablePresets === true || fetching;
  const fieldsOff = disableFields === true || fetching;

  return (
    <div className="rounded-xl border border-border/80 bg-card/75 p-3 shadow-sm backdrop-blur-xl supports-[backdrop-filter]:bg-card/65">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:gap-2">
        <div className="flex gap-2 sm:gap-2">
          <div className="grid gap-1">
            <Label htmlFor="home-desde" className="text-xs">
              Desde
            </Label>
            <DatePickerField
              id="home-desde"
              value={desde}
              onChange={onDesdeChange}
              disabled={fieldsOff}
            />
          </div>
          <div className="grid gap-1">
            <Label htmlFor="home-hasta" className="text-xs">
              Hasta
            </Label>
            <DatePickerField
              id="home-hasta"
              value={hasta}
              onChange={onHastaChange}
              disabled={fieldsOff}
            />
          </div>
        </div>
        <div className="flex flex-wrap gap-1.5 sm:gap-1.5">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 px-2 text-xs bg-primary text-white "
            disabled={presetsOff}
            onClick={() => onApplyRange(rangeEstaSemana())}>
            Esta semana
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 px-2 text-xs bg-primary text-white"
            disabled={presetsOff}
            onClick={() => onApplyRange(rangeSemanaPasada())}>
            Semana pasada
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 px-2 text-xs bg-primary text-white"
            disabled={presetsOff}
            onClick={() => onApplyRange(defaultDashboardMonthBounds())}>
            Mes actual
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 px-2 text-xs bg-primary text-white"
            disabled={presetsOff}
            onClick={() => onApplyRange(rangeMesPasado())}>
            Mes pasado
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 px-2 text-xs bg-primary text-white"
            disabled={presetsOff}
            onClick={() => onApplyRange(rangeEsteAno())}>
            Este año
          </Button>
        </div>
        {fetching ? (
          <span className="flex items-center gap-1.5 text-xs text-muted-foreground sm:ml-auto">
            <Loader2 className="h-3 w-3 shrink-0 animate-spin" aria-hidden />
            Actualizando…
          </span>
        ) : null}
      </div>
    </div>
  );
}

/** Alineado con `--primary` en globals (azul más sobrio). */
const CHART_PRIMARY = "hsl(222 52% 50%)";
const NET_POSITIVE_BAR = "hsl(142 76% 36%)";
const NET_NEGATIVE_BAR = "hsl(0 72% 50%)";

const PIE_COLORS = [
  CHART_PRIMARY,
  "hsl(142 76% 36%)",
  "hsl(38 92% 50%)",
  "hsl(280 65% 48%)",
];

/**
 * KPI con fondo primary. El `Card` base trae `supports-[backdrop-filter]:bg-card/70`, que sin esto
 * volvería a pintar el fondo “card” en navegadores con backdrop-filter y taparía `bg-primary`.
 */
const kpiCardClass =
  "border-primary/25 bg-primary text-primary-foreground shadow-sm transition-shadow hover:shadow-md supports-[backdrop-filter]:bg-primary supports-[backdrop-filter]:text-primary-foreground dark:border-primary-foreground/20 dark:bg-primary/90";

/** Bloque interior sobre KPI primary: reutiliza `--card` / `--card-foreground` (misma superficie que un Card normal en claro u oscuro). */
const kpiInsetPanelClass =
  "space-y-3 rounded-lg border border-border/80 bg-card/95 px-3 py-3 text-sm text-card-foreground shadow-sm backdrop-blur-sm supports-[backdrop-filter]:bg-card/90";
const sectionCardClass =
  "shadow-sm transition-shadow hover:shadow-md";
const sectionTitleClass = "text-lg font-bold tracking-tight text-foreground/80 dark:text-foreground/85";
const sectionDescClass = "text-sm leading-relaxed text-muted-foreground";

function CaducidadProximaTable({
  rows,
  emptyMessage,
  rangeStart,
  rangeEnd,
}: {
  rows: Array<{
    productoId: number;
    nombre: string;
    sku: string;
    stockActual: number;
    fechaCaducidad: string;
  }>;
  emptyMessage: string;
  rangeStart: string; // AAAA-MM-DD
  rangeEnd: string; // AAAA-MM-DD
}) {
  if (rows.length === 0) {
    return (
      <div className="flex min-h-[120px] items-center justify-center rounded-md border border-dashed border-border px-4 py-8 text-sm text-muted-foreground">
        {emptyMessage}
      </div>
    );
  }
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);

  const parseDate = (ymd: string) => {
    const [y, m, d] = ymd.split("-").map(Number);
    const dt = new Date(y, m - 1, d, 0, 0, 0, 0);
    return dt;
  };

  const rangeStartDate = parseDate(rangeStart);
  const rangeEndDate = parseDate(rangeEnd);

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-10 text-center">#</TableHead>
          <TableHead>Producto</TableHead>
          <TableHead className="w-[100px] text-center tabular-nums">
            Stock
          </TableHead>
          <TableHead className="w-[120px] text-center">Caducidad</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((r, i) => {
          const fechaCad = new Date(r.fechaCaducidad);
          const diasRestantes = Math.floor(
            (fechaCad.getTime() - hoy.getTime()) / 86400000,
          );
          const vencido = diasRestantes < 0;
          // Próximo a vencer = cae dentro del rango del filtro y no está vencido
          const pronto =
            !vencido && fechaCad >= rangeStartDate && fechaCad <= rangeEndDate;
          return (
            <TableRow
              key={r.productoId}
              className={
                vencido
                  ? "bg-red-50 dark:bg-red-950/30"
                  : pronto
                    ? "bg-orange-50 dark:bg-orange-950/30"
                    : ""
              }>
              <TableCell className="text-center text-muted-foreground tabular-nums">
                {i + 1}
              </TableCell>
              <TableCell className="font-medium">{r.nombre}</TableCell>
              <TableCell className="text-center tabular-nums">
                {r.stockActual}
              </TableCell>
              <TableCell className="text-center text-sm">
                <span
                  className={
                    vencido
                      ? "font-semibold text-red-600 dark:text-red-400"
                      : pronto
                        ? "font-semibold text-orange-600 dark:text-orange-400"
                        : ""
                  }>
                  {new Intl.DateTimeFormat("es-MX", {
                    dateStyle: "short",
                  }).format(fechaCad)}
                </span>
                {vencido ? (
                  <p className="text-xs text-red-600 dark:text-red-400">
                    Vencido hace {Math.abs(diasRestantes)}d
                  </p>
                ) : pronto ? (
                  <p className="text-xs text-orange-600 dark:text-orange-400">
                    Quedan {diasRestantes}d
                  </p>
                ) : null}
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}

function ProductRankTable({
  rows,
  emptyMessage,
  cantidadHeader,
}: {
  rows: HomeDashboardProductRank[];
  emptyMessage: string;
  cantidadHeader: string;
}) {
  if (rows.length === 0) {
    return (
      <div className="flex min-h-[120px] items-center justify-center rounded-md border border-dashed border-border px-4 py-8 text-sm text-muted-foreground">
        {emptyMessage}
      </div>
    );
  }
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-10 text-center">#</TableHead>
          <TableHead>Producto</TableHead>
          <TableHead className="w-[100px] text-right tabular-nums">
            {cantidadHeader}
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((r, i) => (
          <TableRow key={r.productoId}>
            <TableCell className="text-center text-muted-foreground tabular-nums">
              {i + 1}
            </TableCell>
            <TableCell className="font-medium">{r.nombre}</TableCell>
            <TableCell className="text-right tabular-nums">
              {r.cantidad}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

function formatMoney(amount: number, moneda: string): string {
  try {
    return new Intl.NumberFormat("es-MX", {
      style: "currency",
      currency: moneda || "MXN",
    }).format(amount);
  } catch {
    return `$${amount.toFixed(2)}`;
  }
}

function metodoLabel(m: string): string {
  switch (m) {
    case "EFECTIVO":
      return "Efectivo";
    case "TARJETA":
      return "Tarjeta";
    case "TRANSFERENCIA":
      return "Transferencia";
    default:
      return m;
  }
}

function MomBadge({
  pct,
  invert,
  variant = "default",
}: {
  pct: number | null;
  invert?: boolean;
  /** `onPrimary`: texto legible sobre fondo primary (KPI). */
  variant?: "default" | "onPrimary";
}) {
  const muted =
    variant === "onPrimary" ? "text-primary-foreground/70" : "text-muted-foreground";
  if (pct == null) {
    return <span className={cn("text-xs", muted)}>Sin comparativa con el periodo anterior</span>;
  }
  if (pct === 0) {
    return <span className={cn("text-xs", muted)}>Igual que el periodo anterior (0%)</span>;
  }
  const up = pct > 0;
  const down = pct < 0;
  const good = invert ? down : up;
  const bad = invert ? up : down;
  const goodCls =
    variant === "onPrimary"
      ? "text-emerald-200"
      : "text-emerald-600 dark:text-emerald-400";
  const badCls =
    variant === "onPrimary" ? "text-red-200" : "text-red-600 dark:text-red-400";
  return (
    <span
      className={cn(
        "text-xs font-medium tabular-nums",
        good && goodCls,
        bad && badCls,
      )}>
      {up ? "↑" : "↓"} {Math.abs(pct).toFixed(1)}% vs periodo anterior
    </span>
  );
}

function KpiCard({
  title,
  subtitle,
  value,
  secondary,
  momPct,
  invertMom,
}: {
  title: string;
  subtitle?: string;
  value: string;
  secondary?: string;
  momPct: number | null;
  invertMom?: boolean;
}) {
  return (
    <Card className={kpiCardClass}>
      <CardHeader className="space-y-1 pb-2 pt-5">
        <p className="text-sm font-medium leading-snug text-primary-foreground/85">{title}</p>
        {subtitle ? (
          <p className="text-xs leading-snug text-primary-foreground/75">{subtitle}</p>
        ) : null}
      </CardHeader>
      <CardContent className="space-y-2 pt-0">
        <p className="text-2xl font-semibold tabular-nums tracking-tight text-primary-foreground">
          {value}
        </p>
        {secondary ? (
          <p className="text-xs leading-relaxed text-primary-foreground/75">{secondary}</p>
        ) : null}
        <MomBadge pct={momPct} invert={invertMom} variant="onPrimary" />
      </CardContent>
    </Card>
  );
}

export function HomeDashboard() {
  const defaults = defaultDashboardMonthBounds();
  const [desde, setDesde] = useState(defaults.desde);
  const [hasta, setHasta] = useState(defaults.hasta);
  const [stats, setStats] = useState<HomeDashboardStats | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [fetching, setFetching] = useState(false);

  const setDesdeSafe = (v: string) => {
    setDesde(v);
    if (v && hasta && v > hasta) setHasta(v);
  };

  const setHastaSafe = (v: string) => {
    setHasta(v);
    if (v && desde && desde > v) setDesde(v);
  };

  const applyRange = (r: { desde: string; hasta: string }) => {
    setDesde(r.desde);
    setHasta(r.hasta);
  };

  useEffect(() => {
    const api = window.api?.stats;
    if (!api) {
      setError("Ejecuta la app con Electron para ver las métricas.");
      setLoading(false);
      return;
    }
    if (!desde || !hasta) return;

    let cancelled = false;
    void (async () => {
      try {
        setFetching(true);
        const row = await api.getHomeDashboard({ desde, hasta });
        if (!cancelled) {
          setStats(row);
          setError(null);
        }
      } catch (e) {
        if (!cancelled) setError((e as Error).message);
      } finally {
        if (!cancelled) {
          setFetching(false);
          setLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [desde, hasta]);

  const api = window.api?.stats;

  if (!api) {
    return (
      <Alert variant="destructive">
        <AlertDescription>
          Ejecuta la app con Electron para ver las métricas.
        </AlertDescription>
      </Alert>
    );
  }

  if (loading && !stats) {
    return (
      <div className="space-y-6">
        <HomeDashboardRangeToolbar
          desde={desde}
          hasta={hasta}
          onDesdeChange={setDesdeSafe}
          onHastaChange={setHastaSafe}
          onApplyRange={applyRange}
          fetching
          disableFields
          disablePresets
        />
        <div className="flex min-h-[200px] items-center justify-center rounded-lg border border-dashed border-border">
          <div
            className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent"
            aria-hidden
          />
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="space-y-4">
        <HomeDashboardRangeToolbar
          desde={desde}
          hasta={hasta}
          onDesdeChange={setDesdeSafe}
          onHastaChange={setHastaSafe}
          onApplyRange={applyRange}
          fetching={fetching}
        />
        {error ? (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}
      </div>
    );
  }

  const {
    moneda,
    mesActualLabel,
    mesAnteriorLabel,
    ingresos,
    gastos,
    ventasCount,
    ticketPromedio,
    balanceActual,
    resumenNeto,
    series6m,
    netoEstimadoUltimos6Meses,
    metodoPagoMes,
    productosMasVendidos,
    productosMenosVendidos,
    productosProximosCaducar,
  } = stats;

  const diasRango = inclusiveDayCountYmd(desde, hasta);

  const pieData = metodoPagoMes
    .filter((r) => r.total > 0)
    .map((r) => ({ name: metodoLabel(r.metodoPago), value: r.total }));

  const masVendidosOrdenados = [...productosMasVendidos].sort(
    (a, b) => b.cantidad - a.cantidad,
  );
  const menosVendidosOrdenados = [...productosMenosVendidos].sort(
    (a, b) => a.cantidad - b.cantidad,
  );

  return (
    <div className="space-y-6">
      <HomeDashboardRangeToolbar
        desde={desde}
        hasta={hasta}
        onDesdeChange={setDesdeSafe}
        onHastaChange={setHastaSafe}
        onApplyRange={applyRange}
        fetching={fetching}
      />

      {error ? (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      <div
        className={cn(
          "space-y-6 transition-opacity",
          fetching && "pointer-events-none opacity-60",
        )}>
        <div>
          <h3 className="text-2xl font-bold tracking-tight text-foreground/85">
            Resumen
          </h3>
          <p className="text-sm leading-relaxed text-muted-foreground">
            Cifras de{" "}
            <span className="font-bold text-foreground/80">{mesActualLabel}</span>{" "}
            · Comparativa vs{" "}
            <span className="font-bold text-foreground/80">{mesAnteriorLabel}</span>{" "}
            (misma duración en días; solo ventas activas).
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <KpiCard
            title="Ingresos por ventas"
            value={formatMoney(ingresos.actual, moneda)}
            secondary={`Periodo anterior: ${formatMoney(ingresos.anterior, moneda)}`}
            momPct={ingresos.momPct}
          />
          <KpiCard
            title="Gastos"
            value={formatMoney(gastos.actual, moneda)}
            secondary={`Periodo anterior: ${formatMoney(gastos.anterior, moneda)}`}
            momPct={gastos.momPct}
            invertMom
          />
          <Card className={kpiCardClass}>
            <CardHeader className="space-y-1 pb-2 pt-5">
              <p className="text-sm font-medium leading-snug text-primary-foreground/85">
              Ingresos por ventas − gastos del periodo
              </p>
            </CardHeader>
            <CardContent className="pt-0">
              <p
                className={cn(
                  "text-2xl font-semibold tabular-nums tracking-tight",
                  balanceActual >= 0
                    ? "text-white dark:text-emerald-400"
                    : "text-red-600 dark:text-red-400",
                )}>
                {formatMoney(balanceActual, moneda)}
              </p>
            </CardContent>
          </Card>
          <KpiCard
            title="Ticket promedio"
            subtitle={`${ventasCount.actual} ventas en el periodo`}
            value={formatMoney(ticketPromedio.actual, moneda)}
            secondary={
              ventasCount.anterior > 0
                ? `${ventasCount.anterior} ventas periodo ant. · ${formatMoney(ticketPromedio.anterior, moneda)}`
                : "Sin ventas en el periodo anterior"
            }
            momPct={ticketPromedio.momPct}
          />
        </div>

        <Card >
          <CardHeader className="space-y-1.5 pb-2">
            <CardTitle className="text-lg font-bold tracking-tight ">
              Ingreso neto estimado
            </CardTitle>
            <CardDescription className="text-sm leading-relaxed /80">
              Ventas activas menos costo histórico vendido, gastos, depreciación prorrateada (mensual ÷ 30 ×{" "}
              <span className="font-medium ">{diasRango}</span> días) y costo estimado de
              mermas (cantidad × costo actual del producto al generar estas cifras).
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="grid gap-6 md:grid-cols-[minmax(0,20rem)_minmax(0,1fr)] md:items-start">
              <div className="flex min-w-0 flex-col items-stretch gap-4">
                <div className="space-y-2">
                  <p
                    className={cn(
                      "text-3xl font-semibold tabular-nums tracking-tight",
                      resumenNeto.ingresoNeto.actual >= 0
                        ? "text-emerald-600 dark:text-emerald-400"
                        : "text-red-600 dark:text-red-400",
                    )}>
                    {formatMoney(resumenNeto.ingresoNeto.actual, moneda)}
                  </p>
                  <p className="text-xs leading-relaxed text-primary-foreground/75">
                    Periodo anterior ({mesAnteriorLabel}):{" "}
                    <span className="font-medium text-primary-foreground">
                      {formatMoney(resumenNeto.ingresoNeto.anterior, moneda)}
                    </span>
                  </p>
                  <MomBadge pct={resumenNeto.ingresoNeto.momPct} variant="onPrimary" />
                </div>
                <div className="flex w-full min-w-0 flex-col items-start border-t border-primary-foreground/20 pt-4">
                  <p className="mb-2 text-left text-[11px] font-medium uppercase tracking-wide text-primary-foreground/70">
                    Neto estimado · últimos 6 meses (calendario)
                  </p>
                  <div className="h-[160px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={netoEstimadoUltimos6Meses}
                        margin={{ top: 8, right: 4, left: 0, bottom: 0 }}
                      >
                        <CartesianGrid
                          strokeDasharray="3 3"
                          className="stroke-border"
                          vertical={false}
                        />
                        <XAxis
                          dataKey="mesCorto"
                          tick={{ fontSize: 10 }}
                          className="fill-muted-foreground"
                          interval={0}
                        />
                        <YAxis width={32} tick={{ fontSize: 10 }} className="fill-muted-foreground" tickFormatter={(v) =>
                          new Intl.NumberFormat("es-MX", {
                            notation: "compact",
                            compactDisplay: "short",
                            maximumFractionDigits: 0,
                          }).format(Number(v))
                        } />
                        <ReferenceLine y={0} stroke="hsl(var(--border))" strokeWidth={1} />
                        <Tooltip
                          content={(props) => {
                            if (!props.active || !props.payload?.length) return null;
                            const row = props.payload[0]?.payload as {
                              mesCorto?: string;
                              monthKey?: string;
                              ingresoNeto?: number;
                            };
                            const v = Number(row?.ingresoNeto ?? 0);
                            return (
                              <div className="rounded-md border bg-popover px-2.5 py-2 text-xs shadow-md">
                                <p className="font-medium text-popover-foreground">
                                  {String(row?.monthKey ?? "")} ({String(row?.mesCorto ?? "")})
                                </p>
                                <p
                                  className={cn(
                                    "tabular-nums",
                                    v >= 0
                                      ? "text-emerald-600 dark:text-emerald-400"
                                      : "text-red-600 dark:text-red-400",
                                  )}
                                >
                                  {formatMoney(v, moneda)}
                                </p>
                              </div>
                            );
                          }}
                        />
                        <Bar dataKey="ingresoNeto" name="Ingreso neto est." radius={[3, 3, 0, 0]}>
                          {netoEstimadoUltimos6Meses.map((p) => (
                            <Cell
                              key={p.monthKey}
                              fill={p.ingresoNeto >= 0 ? NET_POSITIVE_BAR : NET_NEGATIVE_BAR}
                            />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
              <div className={kpiInsetPanelClass}>
                <p className="text-xs uppercase tracking-wide text-muted-foreground font-bold">
                  Desglose del periodo
                </p>
                <ul className="space-y-2">
                  <li className="flex justify-between gap-3 tabular-nums">
                    <span className="text-muted-foreground font-">Ingresos por ventas</span>
                    <span className="font-black text-foreground">
                      {formatMoney(ingresos.actual, moneda)}
                    </span>
                  </li>
                  <li className="flex justify-between gap-3 tabular-nums">
                    <span className="text-muted-foreground">− Costo de ventas (histórico)</span>
                    <span className="font-black text-foreground">
                      −{formatMoney(resumenNeto.costoVentas.actual, moneda)}
                    </span>
                  </li>
                  <li className="flex justify-between gap-3 tabular-nums">
                    <span className="text-muted-foreground">− Gastos</span>
                    <span className="font-black text-foreground">
                      −{formatMoney(gastos.actual, moneda)}
                    </span>
                  </li>
                  <li className="flex justify-between gap-3 tabular-nums">
                    <span className="text-muted-foreground">− Depreciación estimada</span>
                    <span className="font-black text-foreground">
                      −{formatMoney(resumenNeto.depreciacionEstimada.actual, moneda)}
                    </span>
                  </li>
                  <li className="flex justify-between gap-3 tabular-nums">
                    <span className="text-muted-foreground">− Mermas (costo estimado)</span>
                    <span className="font-black text-foreground">
                      −{formatMoney(resumenNeto.costoMermas.actual, moneda)}
                    </span>
                  </li>
                </ul>
                <p className="border-t border-border/60 pt-2 text-xs leading-relaxed text-muted-foreground">
                  Depreciación mensual en configuración:{" "}
                  <span className="font-medium text-foreground/80">
                    {formatMoney(resumenNeto.depreciacionMensual, moneda)}
                  </span>
                  . Ajusta ese monto en Configuración si tu ritmo de gasto no operativo es otro. Las mermas se registran
                  en Operaciones → Mermas; su costo en este resumen usa el precio de costo vigente del catálogo, no el del
                  día del movimiento.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-6 lg:grid-cols-5">
          <Card className={cn("lg:col-span-3", sectionCardClass)}>
            <CardHeader>
              <CardTitle className="text-base font-bold tracking-tight ">
                Tendencia últimos 12 meses
              </CardTitle>
              <CardDescription className={sectionDescClass}>
                Ingresos por ventas y gastos por mes calendario; el último mes
                es el de la fecha «Hasta».
              </CardDescription>
            </CardHeader>
            <CardContent className="h-[300px] w-full pt-0">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={series6m}
                  margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    className="stroke-border"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="mesCorto"
                    tick={{ fontSize: 11 }}
                    className="fill-muted-foreground"
                  />
                  <YAxis
                    tick={{ fontSize: 11 }}
                    className="fill-muted-foreground"
                    tickFormatter={(v) =>
                      new Intl.NumberFormat("es-MX", {
                        notation: "compact",
                        compactDisplay: "short",
                        maximumFractionDigits: 1,
                      }).format(Number(v))
                    }
                    width={44}
                  />
                  <Tooltip
                    content={(props) => {
                      if (!props.active || !props.payload?.length) return null;
                      return (
                        <div className="rounded-md border bg-popover px-3 py-2 text-xs shadow-md">
                          <p className="font-medium text-popover-foreground">
                            {String(props.label ?? "")}
                          </p>
                          {props.payload.map((p) => (
                            <p
                              key={String(p.dataKey)}
                              className="text-muted-foreground">
                              {p.name}: {formatMoney(Number(p.value), moneda)}
                            </p>
                          ))}
                        </div>
                      );
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Bar
                    dataKey="ingresos"
                    name="Ingresos"
                    fill={CHART_PRIMARY}
                    radius={[4, 4, 0, 0]}
                  />
                  <Bar
                    dataKey="gastos"
                    name="Gastos"
                    fill="hsl(25 95% 53%)"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card className={cn("lg:col-span-2", sectionCardClass)}>
            <CardHeader>
              <CardTitle className={sectionTitleClass}>
                Ventas por método de pago
              </CardTitle>
              <CardDescription className={sectionDescClass}>
                Distribución en el periodo seleccionado.
              </CardDescription>
            </CardHeader>
            <CardContent className="h-[300px] w-full pt-0">
              {pieData.length === 0 ? (
                <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                  No hay ventas en este periodo.
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={52}
                      outerRadius={80}
                      paddingAngle={2}>
                      {pieData.map((row, i) => (
                        <Cell
                          key={`${row.name}-${i}`}
                          fill={PIE_COLORS[i % PIE_COLORS.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value: number) => formatMoney(value, moneda)}
                      contentStyle={{ borderRadius: 8, fontSize: 12 }}
                    />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card className={sectionCardClass}>
            <CardHeader>
              <CardTitle className={sectionTitleClass}>
                Productos más vendidos
              </CardTitle>
              <CardDescription className={sectionDescClass}>
                Top 10 por unidades en el periodo (ventas activas). Orden
                descendente por cantidad.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              <ProductRankTable
                rows={masVendidosOrdenados}
                emptyMessage="Aún no hay ventas con detalle de producto en este periodo."
                cantidadHeader="Unidades"
              />
            </CardContent>
          </Card>

          <Card className={sectionCardClass}>
            <CardHeader>
              <CardTitle className={sectionTitleClass}>Menor rotación</CardTitle>
              <CardDescription className={sectionDescClass}>
                10 productos con menos unidades vendidas entre los que sí
                vendieron en el periodo (menos unidades arriba). No incluye
                productos sin ventas en el periodo.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              <ProductRankTable
                rows={menosVendidosOrdenados}
                emptyMessage="Sin datos de ventas por producto en este periodo."
                cantidadHeader="Unidades"
              />
            </CardContent>
          </Card>
        </div>

        <Card className={sectionCardClass}>
          <CardHeader>
            <CardTitle className={sectionTitleClass}>Próximos a caducar</CardTitle>
            <CardDescription className={sectionDescClass}>
              10 productos con stock activo, ordenados por fecha de caducidad
              más cercana. Rojo: vencidos; naranja: próximos a vencer (dentro
              del rango del filtro).
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <CaducidadProximaTable
              rows={productosProximosCaducar}
              emptyMessage="No hay productos activos con fecha de caducidad registrada."
              rangeStart={desde}
              rangeEnd={hasta}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
