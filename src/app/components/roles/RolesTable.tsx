import type { ReactNode } from 'react';
import { Pencil, Trash2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';
import type { Rol } from '@/types/electron';

export interface RolesTableProps {
  roles: Rol[];
  totalCount: number;
  onEdit: (rol: Rol) => void;
  onDelete: (rol: Rol) => void;
  footer?: ReactNode;
  className?: string;
}

export function RolesTable({ roles, totalCount, onEdit, onDelete, footer, className }: RolesTableProps) {
  return (
    <Card className={cn(className)}>
      <CardContent className="p-0">
        {roles.length === 0 ? (
          <p className="py-12 text-center text-muted-foreground">
            {totalCount === 0 ? 'No hay roles registrados aún.' : 'No hay roles en esta página.'}
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {roles.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium">{r.nombre}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-foreground"
                        aria-label={`Editar rol ${r.nombre}`}
                        onClick={() => onEdit(r)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                        aria-label={`Eliminar rol ${r.nombre}`}
                        onClick={() => onDelete(r)}
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
