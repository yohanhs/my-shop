import { NavLink, Outlet } from 'react-router-dom';
import { LayoutDashboard, Package, Settings, Shield, ShoppingCart, Truck, Users, Wallet } from 'lucide-react';

import { cn } from '@/lib/utils';

const navItems = [
  { to: '/', label: 'Inicio', icon: LayoutDashboard, end: true },
  { to: '/productos', label: 'Productos', icon: Package, end: false },
  { to: '/proveedores', label: 'Proveedores', icon: Truck, end: false },
  { to: '/usuarios', label: 'Usuarios', icon: Users, end: false },
  { to: '/roles', label: 'Roles', icon: Shield, end: false },
  { to: '/ventas', label: 'Ventas', icon: ShoppingCart, end: false },
  { to: '/gastos', label: 'Gastos', icon: Wallet, end: false },
  { to: '/configuracion', label: 'Configuración', icon: Settings, end: false },
] as const;

export function AppShell() {
  return (
    <div className="flex min-h-screen bg-background">
      <aside className="flex w-56 shrink-0 flex-col border-r border-border bg-card">
        <div className="border-b border-border px-4 py-4">
          <h1 className="text-lg font-semibold tracking-tight">Mi Tienda</h1>
          <p className="text-xs text-muted-foreground">Gestión offline</p>
        </div>
        <nav className="flex flex-1 flex-col gap-1 p-2" aria-label="Navegación principal">
          {navItems.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors',
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
        </nav>
      </aside>
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <main className="flex-1 overflow-auto p-6">
          <div className="mx-auto max-w-7xl">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
