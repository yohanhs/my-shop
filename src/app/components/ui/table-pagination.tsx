import { ChevronLeft, ChevronRight } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const PAGE_SIZE_OPTIONS = [10, 25, 50] as const;

export interface TablePaginationProps {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
  className?: string;
}

export function TablePagination({
  page,
  pageSize,
  total,
  onPageChange,
  onPageSizeChange,
  className,
}: TablePaginationProps) {
  const lastPage = Math.max(1, Math.ceil(total / pageSize) || 1);
  const safePage = Math.min(page, lastPage);
  const from = total === 0 ? 0 : (safePage - 1) * pageSize + 1;
  const to = Math.min(safePage * pageSize, total);

  return (
    <div
      className={cn(
        'flex flex-col gap-4 border-t border-border px-2 py-4 sm:flex-row sm:items-center sm:justify-between',
        className,
      )}
    >
      <p className="text-sm text-muted-foreground">
        {total === 0 ? 'Sin registros' : `Mostrando ${from}–${to} de ${total}`}
      </p>
      <div className="flex flex-wrap items-center gap-3">
        {onPageSizeChange && (
          <label className="flex items-center gap-2 text-sm text-muted-foreground">
            <span className="whitespace-nowrap">Por página</span>
            <select
              className="h-9 rounded-md border border-input bg-background px-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              value={pageSize}
              onChange={(e) => onPageSizeChange(Number(e.target.value))}
            >
              {PAGE_SIZE_OPTIONS.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </label>
        )}
        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="h-8 w-8"
            disabled={safePage <= 1}
            aria-label="Página anterior"
            onClick={() => onPageChange(safePage - 1)}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="min-w-[7rem] text-center text-sm tabular-nums text-muted-foreground">
            Página {safePage} de {lastPage}
          </span>
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="h-8 w-8"
            disabled={safePage >= lastPage || total === 0}
            aria-label="Página siguiente"
            onClick={() => onPageChange(safePage + 1)}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
