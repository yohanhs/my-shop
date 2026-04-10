import type { ReactNode } from 'react';
import { Pencil, Trash2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';
import type { Proveedor } from '@/types/electron';

export interface ProveedoresTableProps {
  proveedores: Proveedor[];
  totalCount: number;
  onEdit: (p: Proveedor) => void;
  onDelete: (p: Proveedor) => void;
  footer?: ReactNode;
  className?: string;
}

function formatFecha(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return new Intl.DateTimeFormat('es-MX', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(d);
}

function CellText({ value }: { value: string | null }) {
  if (value == null || value === '') {
    return <span className="text-muted-foreground">—</span>;
  }
  return <span>{value}</span>;
}

export function ProveedoresTable({
  proveedores,
  totalCount,
  onEdit,
  onDelete,
  footer,
  className,
}: ProveedoresTableProps) {
  return (
    <Card className={cn(className)}>
      <CardContent className="p-0">
        {proveedores.length === 0 ? (
          <p className="py-12 text-center text-muted-foreground">
            {totalCount === 0 ? 'No hay proveedores registrados aún.' : 'No hay proveedores en esta página.'}
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>Empresa</TableHead>
                <TableHead>Teléfono</TableHead>
                <TableHead>Email</TableHead>
                <TableHead className="max-w-[200px]">Dirección</TableHead>
                <TableHead className="whitespace-nowrap">Creado</TableHead>
                <TableHead className="whitespace-nowrap">Actualizado</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {proveedores.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">{p.nombre}</TableCell>
                  <TableCell>
                    <CellText value={p.empresa} />
                  </TableCell>
                  <TableCell className="font-mono text-sm">
                    <CellText value={p.telefono} />
                  </TableCell>
                  <TableCell className="text-sm">
                    <CellText value={p.email} />
                  </TableCell>
                  <TableCell className="max-w-[200px] text-sm text-muted-foreground">
                    {p.direccion ? (
                      <span className="line-clamp-2" title={p.direccion}>
                        {p.direccion}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-sm text-muted-foreground" title={p.createdAt}>
                    {formatFecha(p.createdAt)}
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-sm text-muted-foreground" title={p.updatedAt}>
                    {formatFecha(p.updatedAt)}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-foreground"
                        aria-label={`Editar ${p.nombre}`}
                        onClick={() => onEdit(p)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                        aria-label={`Eliminar ${p.nombre}`}
                        onClick={() => onDelete(p)}
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
