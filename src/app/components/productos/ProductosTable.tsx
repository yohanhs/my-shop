import type { ReactNode } from 'react';
import { Eye, Pencil, Trash2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';
import type { Producto } from '@/types/electron';

export interface ProductosTableProps {
  productos: Producto[];
  /** Total en BD (todas las páginas); sirve para el mensaje cuando la lista está vacía. */
  totalCount: number;
  onView: (producto: Producto) => void;
  onEdit: (producto: Producto) => void;
  onDelete: (producto: Producto) => void;
  /** Contenido bajo la tabla (p. ej. paginación). */
  footer?: ReactNode;
  /** Clases extra en el `Card` contenedor. */
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

function ProductoEstadoBadge({ status }: { status: string }) {
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

export function ProductosTable({
  productos,
  totalCount,
  onView,
  onEdit,
  onDelete,
  footer,
  className,
}: ProductosTableProps) {
  return (
    <Card className={cn(className)}>
      <CardContent className="p-0">
        {productos.length === 0 ? (
          <p className="py-12 text-center text-muted-foreground">
            {totalCount === 0
              ? 'No hay productos registrados aún.'
              : 'No hay productos en esta página.'}
          </p>
        ) : (
          <Table>
          <TableHeader>
            <TableRow>
              <TableHead>SKU</TableHead>
              <TableHead>Nombre</TableHead>
              <TableHead className="max-w-[200px]">Descripción</TableHead>
              <TableHead>Precio venta</TableHead>
              <TableHead>Stock</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="whitespace-nowrap">Creado</TableHead>
              <TableHead className="whitespace-nowrap">Actualizado</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {productos.map((p) => (
              <TableRow key={p.id}>
                <TableCell className="font-mono text-muted-foreground">{p.sku}</TableCell>
                <TableCell className="font-medium">{p.nombre}</TableCell>
                <TableCell className="max-w-[200px] text-muted-foreground">
                  {p.descripcion ? (
                    <span className="line-clamp-2 text-sm" title={p.descripcion}>
                      {p.descripcion}
                    </span>
                  ) : (
                    <span className="text-sm">—</span>
                  )}
                </TableCell>
                <TableCell>${p.precioVenta.toFixed(2)}</TableCell>
                <TableCell>
                  <span
                    className={
                      p.stockActual <= p.stockMinimo ? 'font-semibold text-destructive' : undefined
                    }
                  >
                    {p.stockActual}
                  </span>
                </TableCell>
                <TableCell>
                  <ProductoEstadoBadge status={p.status} />
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
                      aria-label={`Ver detalle de ${p.nombre}`}
                      onClick={() => onView(p)}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
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
