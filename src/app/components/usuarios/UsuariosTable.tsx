import type { ReactNode } from 'react';
import { Pencil, Trash2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';
import type { Usuario } from '@/types/electron';

export interface UsuariosTableProps {
  usuarios: Usuario[];
  totalCount: number;
  onEdit: (u: Usuario) => void;
  onDelete: (u: Usuario) => void;
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

function UsuarioEstadoBadge({ status }: { status: string }) {
  const activo = status === 'ACTIVE';
  return (
    <span
      className={
        activo
          ? 'inline-flex rounded-full bg-green-100 px-2 py-1 text-xs font-semibold text-green-800'
          : 'inline-flex rounded-full bg-red-100 px-2 py-1 text-xs font-semibold text-red-800'
      }
    >
      {activo ? 'Activo' : 'Inactivo'}
    </span>
  );
}

export function UsuariosTable({ usuarios, totalCount, onEdit, onDelete, footer, className }: UsuariosTableProps) {
  return (
    <Card className={cn(className)}>
      <CardContent className="p-0">
        {usuarios.length === 0 ? (
          <p className="py-12 text-center text-muted-foreground">
            {totalCount === 0 ? 'No hay usuarios registrados aún.' : 'No hay usuarios en esta página.'}
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>Usuario</TableHead>
                <TableHead>Rol</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="whitespace-nowrap">Creado</TableHead>
                <TableHead className="whitespace-nowrap">Actualizado</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {usuarios.map((u) => (
                <TableRow key={u.id}>
                  <TableCell className="font-medium">{u.nombre}</TableCell>
                  <TableCell className="font-mono text-sm text-muted-foreground">{u.username}</TableCell>
                  <TableCell>{u.rolNombre}</TableCell>
                  <TableCell>
                    <UsuarioEstadoBadge status={u.status} />
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-sm text-muted-foreground" title={u.createdAt}>
                    {formatFecha(u.createdAt)}
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-sm text-muted-foreground" title={u.updatedAt}>
                    {formatFecha(u.updatedAt)}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-foreground"
                        aria-label={`Editar ${u.nombre}`}
                        onClick={() => onEdit(u)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                        aria-label={`Eliminar ${u.nombre}`}
                        onClick={() => onDelete(u)}
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
