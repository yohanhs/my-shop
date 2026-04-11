/** Abre la vista de ticket en una ventana nueva (HashRouter + Electron `file://`). */
export function openVentaTicketPrintWindow(ventaId: number): void {
  const href = window.location.href;
  const withoutHash = href.replace(/#.*$/, '');
  const url = `${withoutHash}#/print/venta/${ventaId}`;
  window.open(url, '_blank', 'noopener,noreferrer,width=440,height=820');
}
