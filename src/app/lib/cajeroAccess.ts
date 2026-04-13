/** Coincide con el nombre del rol en base de datos (`roles.nombre`). */
export function isCajeroRole(rolNombre: string | undefined): boolean {
  return (rolNombre ?? '').trim() === 'Cajero';
}

/** Rutas que el Cajero puede abrir sin redirección (HashRouter `location.pathname`). */
export function cajeroCanAccessPathname(pathname: string): boolean {
  const p = pathname.replace(/\/+$/, '') || '/';
  return (
    p === '/perfil' ||
    p === '/ventas' ||
    p.startsWith('/ventas/') ||
    p.startsWith('/caja/')
  );
}

/** Enlaces del sidebar visibles para el Cajero. */
export function cajeroCanSeeNavTo(to: string): boolean {
  if (to === '/perfil' || to === '/ventas' || to === '/caja/ventas') return true;
  if (to.startsWith('/ventas/')) return true;
  if (to.startsWith('/caja/')) return true;
  return false;
}
