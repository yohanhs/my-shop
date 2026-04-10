import { useEffect, useState } from 'react';

import { VentaEditorDialog } from '@/components/ventas/VentaEditorDialog';
import { VentasFiltersBar } from '@/components/ventas/VentasFiltersBar';
import { VentasTable } from '@/components/ventas/VentasTable';
import { TablePagination } from '@/components/ui/table-pagination';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { useVentaStore } from '@/store/useVentaStore';

export function VentasPage() {
  const {
    ventas,
    total,
    page,
    pageSize,
    loading,
    listLoadOk,
    error,
    clearError,
    fetchVentas,
    setPage,
    setPageSize,
  } = useVentaStore();

  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    void fetchVentas();
  }, [fetchVentas]);

  if (loading && !listLoadOk) {
    return (
      <div className="flex items-center justify-center py-12">
        <div
          className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent"
          aria-hidden
        />
      </div>
    );
  }

  if (error && !listLoadOk) {
    return (
      <Alert variant="destructive">
        <AlertDescription>Error: {error}</AlertDescription>
      </Alert>
    );
  }

  return (
    <div>
      <VentaEditorDialog open={modalOpen} onClose={() => setModalOpen(false)} mode="create" />

      {error && listLoadOk && (
        <Alert variant="destructive" className="mb-4">
          <AlertDescription className="flex flex-wrap items-center justify-between gap-2">
            <span>Error: {error}</span>
            <Button type="button" variant="ghost" size="sm" className="h-auto p-0" onClick={() => clearError()}>
              Cerrar
            </Button>
          </AlertDescription>
        </Alert>
      )}

      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-xl font-semibold tracking-tight">Ventas</h2>
        <Button type="button" onClick={() => setModalOpen(true)}>
          + Nueva venta
        </Button>
      </div>

      <VentasFiltersBar />

      <VentasTable
        ventas={ventas}
        totalCount={total}
        footer={
          <TablePagination
            page={page}
            pageSize={pageSize}
            total={total}
            onPageChange={(p) => void setPage(p)}
            onPageSizeChange={(s) => void setPageSize(s)}
          />
        }
      />
    </div>
  );
}
