import type { ReactNode } from 'react';
import { Eye, Printer } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { openVentaTicketPrintWindow } from '@/lib/ventaTicketPrint';
import { cn } from '@/lib/utils';
import type { VentaListItem } from '@/types/electron';

export interface VentasTableProps {
  ventas: VentaListItem[];
  totalCount: number;
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

function metodoLabel(m: string): string {
  switch (m) {
    case 'EFECTIVO':
      return 'Efectivo';
    case 'TARJETA':
      return 'Tarjeta';
    case 'TRANSFERENCIA':
      return 'Transferencia';
    default:
      return m;
  }
}

function EstadoVentaBadge({ estado }: { estado: string }) {
  const anulada = estado === 'ANULADA';
  return (
    <span
      className={
        anulada
          ? 'inline-flex rounded-full bg-red-100 px-2 py-1 text-xs font-semibold text-red-800'
          : 'inline-flex rounded-full bg-green-100 px-2 py-1 text-xs font-semibold text-green-800'
      }
    >
      {anulada ? 'Anulada' : 'Activa'}
    </span>
  );
}

export function VentasTable({ ventas, totalCount, footer, className }: VentasTableProps) {
  const navigate = useNavigate();

  return (
    <Card className={cn(className)}>
      <CardContent className="p-0">
        {ventas.length === 0 ? (
          <p className="py-12 text-center text-muted-foreground">
            {totalCount === 0 ? 'No hay ventas registradas aún.' : 'No hay ventas en esta página.'}
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fecha</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Pago</TableHead>
                <TableHead>Productos</TableHead>
                <TableHead>Folio</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {ventas.map((v) => (
                <TableRow key={v.id}>
                  <TableCell className="whitespace-nowrap text-sm" title={v.fecha}>
                    {formatFecha(v.fecha)}
                  </TableCell>
                  <TableCell className="font-medium">${v.total.toFixed(2)}</TableCell>
                  <TableCell className="text-sm">{metodoLabel(v.metodoPago)}</TableCell>
                  <TableCell className="text-muted-foreground">{v.lineasCount}</TableCell>
                  <TableCell className="font-mono text-sm text-muted-foreground">
                    {v.ticketFolio ?? '—'}
                  </TableCell>
                  <TableCell>
                    <EstadoVentaBadge estado={v.estado} />
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-foreground"
                        aria-label={`Imprimir ticket venta ${v.id}`}
                        onClick={() => openVentaTicketPrintWindow(v.id)}
                      >
                        <Printer className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-foreground"
                        aria-label={`Ver venta ${v.id}`}
                        onClick={() => navigate(`/ventas/${v.id}`)}
                      >
                        <Eye className="h-4 w-4" />
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
