import { useEffect, useState } from 'react';
import { Filter, RotateCcw, Search } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { RolListFilters } from '@/types/electron';
import { useRolStore } from '@/store/useRolStore';

export function RolesFiltersBar() {
  const listFilters = useRolStore((s) => s.listFilters);
  const applyListFilters = useRolStore((s) => s.applyListFilters);
  const resetListFilters = useRolStore((s) => s.resetListFilters);

  const [draft, setDraft] = useState<RolListFilters>(listFilters);

  useEffect(() => {
    setDraft(listFilters);
  }, [listFilters]);

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
          <Label htmlFor="filtro-rol-nombre">Buscar por nombre</Label>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-stretch">
            <Input
              id="filtro-rol-nombre"
              className="sm:min-w-0 sm:flex-1"
              placeholder="Nombre contiene…"
              value={draft.nombre}
              onChange={(e) => setDraft((d) => ({ ...d, nombre: e.target.value }))}
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
      </CardContent>
    </Card>
  );
}
