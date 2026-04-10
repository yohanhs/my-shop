import type { ReactNode } from 'react';
import { Pencil, Trash2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';
import type { Gasto } from '@/types/electron';

export interface GastosTableProps {
  gastos: Gasto[];
  totalCount: number;
  onEdit: (g: Gasto) => void;
  onDelete: (g: Gasto) => void;
  footer?: ReactNode;
  className?: string;
}

function formatFechaGasto(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return new Intl.DateTimeFormat('es-MX', {
    dateStyle: 'medium',
  }).format(d);
}

export function GastosTable({ gastos, totalCount, onEdit, onDelete, footer, className }: GastosTableProps) {
  return (
    <Card className={cn(className)}>
      <CardContent className="p-0">
        {gastos.length === 0 ? (
          <p className="py-12 text-center text-muted-foreground">
            {totalCount === 0 ? 'No hay gastos registrados aún.' : 'No hay gastos en esta página.'}
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="whitespace-nowrap">Fecha</TableHead>
                <TableHead>Concepto</TableHead>
                <TableHead>Categoría</TableHead>
                <TableHead className="text-right">Monto</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {gastos.map((g) => (
                <TableRow key={g.id}>
                  <TableCell className="whitespace-nowrap text-sm">{formatFechaGasto(g.fecha)}</TableCell>
                  <TableCell className="max-w-[240px]">
                    <span className="line-clamp-2 font-medium" title={g.concepto}>
                      {g.concepto}
                    </span>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{g.categoria}</TableCell>
                  <TableCell className="text-right font-medium tabular-nums">${g.monto.toFixed(2)}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        aria-label={`Editar gasto ${g.id}`}
                        onClick={() => onEdit(g)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        aria-label={`Eliminar gasto ${g.id}`}
                        onClick={() => onDelete(g)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
        {footer}
      </CardContent>
    </Card>
  );
}
