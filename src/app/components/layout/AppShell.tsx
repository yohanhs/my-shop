import type { LucideIcon } from 'lucide-react';
import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Package,
  Settings,
  ShoppingCart,
  Truck,
  UserCircle,
  Users,
  Wallet,
  ScanLine,
  PackageX,
} from 'lucide-react';

import { AppTopBar } from '@/components/layout/AppTopBar';
import {
  DEFAULT_NOMBRE_TIENDA,
  SHOP_CONFIG_UPDATED_EVENT,
  resolveNombreTienda,
} from '@/lib/shopBranding';
import { cajeroCanSeeNavTo, isCajeroRole } from '@/lib/cajeroAccess';
import { cn } from '@/lib/utils';
import { useAuth } from '@/providers/AuthProvider';

type NavItem = {
  to: string;
  label: string;
  icon: LucideIcon;
  end?: boolean;
};

type NavSection = {
  id: string;
  /** `null` = sin título (solo enlaces, p. ej. Inicio). */
  title: string | null;
  items: readonly NavItem[];
};

const navSections: readonly NavSection[] = [
  {
    id: 'inicio',
    title: null,
    items: [{ to: '/', label: 'Inicio', icon: LayoutDashboard, end: true }],
  },
  {
    id: 'nomencladores',
    title: 'Nomencladores',
    items: [
      { to: '/productos', label: 'Productos', icon: Package, end: false },
      { to: '/proveedores', label: 'Proveedores', icon: Truck, end: false },
      { to: '/usuarios', label: 'Usuarios', icon: Users, end: false },
    ],
  },
  {
    id: 'operaciones',
    title: 'Operaciones',
    items: [
      { to: '/caja/ventas', label: 'Caja', icon: ScanLine, end: false },
      { to: '/ventas', label: 'Ventas', icon: ShoppingCart, end: false },
      { to: '/gastos', label: 'Gastos', icon: Wallet, end: false },
      { to: '/mermas', label: 'Mermas', icon: PackageX, end: false },
    ],
  },
  {
    id: 'configuracion',
    title: 'Configuración',
    items: [
      { to: '/perfil', label: 'Mi perfil', icon: UserCircle, end: false },
      { to: '/configuracion', label: 'Configuración', icon: Settings, end: false },
    ],
  },
] as const;

const SUPERADMIN_PATHS = new Set(['/usuarios']);

function canSeeNavPath(rolNombre: string | undefined, to: string): boolean {
  if (isCajeroRole(rolNombre)) {
    return cajeroCanSeeNavTo(to);
  }
  if (SUPERADMIN_PATHS.has(to)) return rolNombre === 'SuperAdmin';
  return true;
}

function isVentaCajaPath(pathname: string): boolean {
  const p = pathname.replace(/\/+$/, '') || '/';
  return p === '/caja/ventas' || p === '/ventas/caja';
}

export function AppShell() {
  const { user } = useAuth();
  const { pathname } = useLocation();
  const posCajaFullBleed = isVentaCajaPath(pathname);
  const [nombreTienda, setNombreTienda] = useState(DEFAULT_NOMBRE_TIENDA);

  useEffect(() => {
    const api = typeof window !== 'undefined' ? window.api?.configuracion : undefined;
    if (!api) return;

    let cancelled = false;
    const load = () => {
      void (async () => {
        try {
          const row = await api.get();
          if (cancelled) return;
          const name = resolveNombreTienda(row.nombreTienda);
          setNombreTienda(name);
          document.title = `${name} — Gestor de contabilidad`;
        } catch {
          if (!cancelled) {
            setNombreTienda(DEFAULT_NOMBRE_TIENDA);
            document.title = `${DEFAULT_NOMBRE_TIENDA} — Gestor de contabilidad`;
          }
        }
      })();
    };

    load();
    window.addEventListener(SHOP_CONFIG_UPDATED_EVENT, load);
    return () => {
      cancelled = true;
      window.removeEventListener(SHOP_CONFIG_UPDATED_EVENT, load);
    };
  }, []);

  return (
    <div className="relative isolate flex h-[100dvh] min-h-0 w-full flex-col overflow-hidden">
      <div className="relative z-10 flex min-h-0 flex-1 overflow-hidden">
        <aside className="flex w-56 shrink-0 flex-col border-r border-border/80 bg-card/75 shadow-sm backdrop-blur-xl supports-[backdrop-filter]:bg-card/65 dark:border-border/60">
            <nav
              className="flex min-h-0 flex-1 flex-col gap-0 overflow-y-auto overscroll-contain p-2 pb-4 pt-3"
              aria-label="Navegación principal"
            >
              {navSections
                .map((section) => ({
                  ...section,
                  items: section.items.filter(({ to }) => canSeeNavPath(user?.rolNombre, to)),
                }))
                .filter((section) => section.items.length > 0)
                .map((section, sectionIndex) => (
                  <div
                    key={section.id}
                    className={cn(
                      'space-y-1',
                      sectionIndex > 0 && 'mt-3 border-t border-border pt-3',
                    )}
                  >
                    {section.title ? (
                      <p
                        className="px-3 pb-1 pt-0.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground italic"
                        role="presentation"
                      >
                        {section.title}
                      </p>
                    ) : null}
                    {section.items.map(({ to, label, icon: Icon, end }) => (
                      <NavLink
                        key={to}
                        to={to}
                        end={end}
                        className={({ isActive }) =>
                          cn(
                            'flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors uppercase',
                            isActive
                              ? 'bg-primary text-primary-foreground'
                              : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                          )
                        }
                      >
                        <Icon className="h-4 w-4 shrink-0" aria-hidden />
                        {label}
                      </NavLink>
                    ))}
                  </div>
                ))}
            </nav>
          </aside>
          <div className="flex min-h-0 min-w-0 flex-1 flex-col">
            <AppTopBar
              nombreTienda={nombreTienda}
              variant={posCajaFullBleed ? 'caja' : 'default'}
            />
            <main
              className={cn(
                'flex min-h-0 flex-1 flex-col',
                posCajaFullBleed ? 'overflow-hidden' : 'overflow-auto p-6',
              )}
            >
              <div
                className={cn(
                  posCajaFullBleed
                    ? 'flex min-h-0 min-w-0 flex-1 flex-col'
                    : 'mx-auto w-full max-w-7xl',
                )}
              >
                <Outlet />
              </div>
            </main>
          </div>
      </div>
    </div>
  );
}
