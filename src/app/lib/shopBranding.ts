/** Nombre mostrado si no hay valor en configuración o viene vacío. */
export const DEFAULT_NOMBRE_TIENDA = 'Mi Tienda';

export const SHOP_CONFIG_UPDATED_EVENT = 'my-shop:shop-config-updated';

export function resolveNombreTienda(raw: string | null | undefined): string {
  const t = typeof raw === 'string' ? raw.trim() : '';
  return t.length > 0 ? t : DEFAULT_NOMBRE_TIENDA;
}

export function dispatchShopConfigUpdated(): void {
  window.dispatchEvent(new CustomEvent(SHOP_CONFIG_UPDATED_EVENT));
}
