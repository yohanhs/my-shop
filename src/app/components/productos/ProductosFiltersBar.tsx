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
import type { ProductoListFilters, ProductoStatusFilter } from '@/types/electron';
import { useProductStore } from '@/store/useProductStore';

export function ProductosFiltersBar() {
  const listFilters = useProductStore((s) => s.listFilters);
  const applyListFilters = useProductStore((s) => s.applyListFilters);
  const resetListFilters = useProductStore((s) => s.resetListFilters);

  const [draft, setDraft] = useState<ProductoListFilters>(listFilters);
  const [advancedOpen, setAdvancedOpen] = useState(false);

  useEffect(() => {
    setDraft(listFilters);
  }, [listFilters]);

  const patch = (partial: Partial<ProductoListFilters>) => {
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
          <Label htmlFor="filtro-busqueda-nombre">Buscar por nombre</Label>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-stretch">
            <Input
              id="filtro-busqueda-nombre"
              className="sm:min-w-0 sm:flex-1"
              placeholder="Nombre contiene…"
              value={draft.nombre}
              onChange={(e) => patch({ nombre: e.target.value })}
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
              <Button
                type="button"
                variant="outline"
                className="gap-2"
                onClick={() => void resetListFilters()}
              >
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
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="filtro-sku">SKU</Label>
                <Input
                  id="filtro-sku"
                  className="font-mono"
                  placeholder="Contiene…"
                  value={draft.sku}
                  onChange={(e) => patch({ sku: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Estado</Label>
                <Select
                  value={draft.status === '' ? 'all' : draft.status}
                  onValueChange={(v) =>
                    patch({ status: (v === 'all' ? '' : v) as ProductoStatusFilter })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="ACTIVE">Activo</SelectItem>
                    <SelectItem value="INACTIVE">Inactivo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="space-y-2">
                <Label htmlFor="filtro-creado-desde">Creado desde</Label>
                <DatePickerField
                  id="filtro-creado-desde"
                  value={draft.createdFrom}
                  onChange={(v) => patch({ createdFrom: v })}
                  placeholder="Sin límite"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="filtro-creado-hasta">Creado hasta</Label>
                <DatePickerField
                  id="filtro-creado-hasta"
                  value={draft.createdTo}
                  onChange={(v) => patch({ createdTo: v })}
                  placeholder="Sin límite"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="filtro-actualizado-desde">Actualizado desde</Label>
                <DatePickerField
                  id="filtro-actualizado-desde"
                  value={draft.updatedFrom}
                  onChange={(v) => patch({ updatedFrom: v })}
                  placeholder="Sin límite"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="filtro-actualizado-hasta">Actualizado hasta</Label>
                <DatePickerField
                  id="filtro-actualizado-hasta"
                  value={draft.updatedTo}
                  onChange={(v) => patch({ updatedTo: v })}
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
