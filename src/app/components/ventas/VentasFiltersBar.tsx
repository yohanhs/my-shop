import { useEffect, useState } from 'react';
import { ChevronDown, ChevronUp, Filter, RotateCcw, Search } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DatePickerField } from '@/components/ui/date-picker-field';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { VentaEstadoFilter, VentaListFilters, VentaMetodoFilter } from '@/types/electron';
import { useVentaStore } from '@/store/useVentaStore';

export function VentasFiltersBar() {
  const listFilters = useVentaStore((s) => s.listFilters);
  const applyListFilters = useVentaStore((s) => s.applyListFilters);
  const resetListFilters = useVentaStore((s) => s.resetListFilters);

  const [draft, setDraft] = useState<VentaListFilters>(listFilters);
  const [advancedOpen, setAdvancedOpen] = useState(false);

  useEffect(() => {
    setDraft(listFilters);
  }, [listFilters]);

  const patch = (partial: Partial<VentaListFilters>) => {
    setDraft((d) => ({ ...d, ...partial }));
  };

  const apply = () => void applyListFilters(draft);

  return (
    <Card className="mb-6">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base font-medium">
          <Filter className="h-4 w-4" aria-hidden />
          Filtros
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="filtro-venta-folio">Folio (V-12, factura…)</Label>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-stretch">
            <Input
              id="filtro-venta-folio"
              className="sm:min-w-0 sm:flex-1"
              placeholder="Parte del folio…"
              value={draft.ticketFolio}
              onChange={(e) => patch({ ticketFolio: e.target.value })}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  apply();
                }
              }}
            />
            <div className="flex shrink-0 flex-wrap gap-2">
              <Button type="button" className="gap-2 sm:min-w-[7rem]" onClick={apply}>
                <Search className="h-4 w-4" />
                Buscar
              </Button>
              <Button type="button" variant="outline" className="gap-2" onClick={() => void resetListFilters()}>
                <RotateCcw className="h-4 w-4" />
                Limpiar
              </Button>
            </div>
          </div>
        </div>

        <div className="border-t pt-2">
          <Button
            type="button"
            variant="ghost"
            className="h-auto w-full justify-start gap-2 px-2 py-2 text-muted-foreground hover:text-foreground"
            aria-expanded={advancedOpen}
            onClick={() => setAdvancedOpen((o) => !o)}
          >
            {advancedOpen ? (
              <ChevronUp className="h-4 w-4 shrink-0" aria-hidden />
            ) : (
              <ChevronDown className="h-4 w-4 shrink-0" aria-hidden />
            )}
            {advancedOpen ? 'Ocultar filtros avanzados' : 'Mostrar filtros avanzados'}
          </Button>
        </div>

        {advancedOpen ? (
          <div className="space-y-4 border-t pt-4">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="space-y-2">
                <Label>Estado</Label>
                <Select
                  value={draft.estado === '' ? 'all' : draft.estado}
                  onValueChange={(v) => patch({ estado: (v === 'all' ? '' : v) as VentaEstadoFilter })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="ACTIVA">Activa</SelectItem>
                    <SelectItem value="ANULADA">Anulada</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Método de pago</Label>
                <Select
                  value={draft.metodoPago === '' ? 'all' : draft.metodoPago}
                  onValueChange={(v) => patch({ metodoPago: (v === 'all' ? '' : v) as VentaMetodoFilter })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="EFECTIVO">Efectivo</SelectItem>
                    <SelectItem value="TARJETA">Tarjeta</SelectItem>
                    <SelectItem value="TRANSFERENCIA">Transferencia</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="filtro-venta-fecha-desde">Fecha desde</Label>
                <DatePickerField
                  id="filtro-venta-fecha-desde"
                  value={draft.fechaDesde}
                  onChange={(v) => patch({ fechaDesde: v })}
                  placeholder="Sin límite"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="filtro-venta-fecha-hasta">Fecha hasta</Label>
                <DatePickerField
                  id="filtro-venta-fecha-hasta"
                  value={draft.fechaHasta}
                  onChange={(v) => patch({ fechaHasta: v })}
                  placeholder="Sin límite"
                />
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button type="button" className="gap-2" onClick={apply}>
                <Search className="h-4 w-4" />
                Aplicar filtros
              </Button>
              <Button type="button" variant="outline" className="gap-2" onClick={() => void resetListFilters()}>
                <RotateCcw className="h-4 w-4" />
                Limpiar todo
              </Button>
            </div>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
