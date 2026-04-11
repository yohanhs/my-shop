import { useState } from 'react';
import { LogOut, UserRound } from 'lucide-react';
import { NavLink } from 'react-router-dom';

import { ThemeToggle } from '@/components/layout/ThemeToggle';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useAuth } from '@/providers/AuthProvider';

export type AppTopBarProps = {
  /** `nombreTienda` de configuración, o {@link DEFAULT_NOMBRE_TIENDA} si no hay dato. */
  nombreTienda: string;
};

/** Barra superior global: tema, nombre de tienda y sesión (usuario / salir). */
export function AppTopBar({ nombreTienda }: AppTopBarProps) {
  const { user, logout } = useAuth();
  const [loggingOut, setLoggingOut] = useState(false);

  const onLogout = () => {
    setLoggingOut(true);
    void logout().finally(() => setLoggingOut(false));
  };

  return (
    <header className="sticky top-0 z-40 flex h-14 shrink-0 items-center border-b border-border bg-card/90 px-4 shadow-sm backdrop-blur-md supports-[backdrop-filter]:bg-card/75 sm:px-6">
      <div className="mx-auto flex w-full max-w-[1600px] items-center justify-between gap-4">
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Panel</p>
          <p className="truncate text-sm font-semibold text-foreground sm:text-base">{nombreTienda}</p>
        </div>

        <div className="flex shrink-0 items-center gap-2 sm:gap-4">
          <ThemeToggle />

          <div className="hidden h-6 w-px bg-border sm:block" aria-hidden />

          <div className="flex items-stretch gap-0.5 rounded-lg  bg-muted/40 px-0.5 sm:gap-1 sm:p-1">
            <NavLink
              to="/perfil"
              title="Mi perfil"
              aria-label="Ir a mi perfil"
              className={({ isActive }) =>
                cn(
                  'flex min-h-10 min-w-0 max-w-[200px] items-center gap-2 rounded-md px-2 py-1 transition-colors sm:max-w-[240px] sm:min-h-0 sm:px-2.5 sm:py-1.5',
                  'hover:bg-background/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card',
                  isActive && 'bg-background shadow-sm ring-1 ring-border/80',
                )
              }
            >
              <span
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-background shadow-sm ring-1 ring-border"
                aria-hidden
              >
                <UserRound className="h-4 w-4 text-muted-foreground" />
              </span>
              <span className="hidden min-w-0 flex-1 flex-col text-left sm:flex">
                <span className="truncate text-sm font-semibold leading-tight text-foreground" title={user?.nombre}>
                  {user?.nombre ?? '—'}
                </span>
                <span className="truncate text-[11px] leading-tight text-muted-foreground" title={user?.rolNombre}>
                  {user?.rolNombre ?? ''}
                </span>
              </span>
            </NavLink>

            <div className="my-1 w-px shrink-0 bg-border/80" aria-hidden />

            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={loggingOut}
              onClick={onLogout}
              className="h-auto shrink-0 gap-1.5 rounded-md px-2.5 py-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive sm:px-3"
            >
              <LogOut className="h-3.5 w-3.5" aria-hidden />
              <span className="hidden text-xs sm:inline">{loggingOut ? '…' : 'Salir'}</span>
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
}
