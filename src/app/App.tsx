import { HashRouter, Navigate, Outlet, Route, Routes, useLocation } from 'react-router-dom';

import { AppShell } from './components/layout/AppShell';
import { LoginPage } from './pages/LoginPage';
import { useAuth } from './providers/AuthProvider';
import { HomePage } from './pages/HomePage';
import { GastosPage } from './pages/GastosPage';
import { ProductoDetallePage } from './pages/ProductoDetallePage';
import { ProductosPage } from './pages/ProductosPage';
import { ConfiguracionPage } from './pages/ConfiguracionPage';
import { ProveedoresPage } from './pages/ProveedoresPage';
import { UsuariosPage } from './pages/UsuariosPage';
import { VentaDetallePage } from './pages/VentaDetallePage';
import { VentaPrintTicketPage } from './pages/VentaPrintTicketPage';
import { PerfilPage } from './pages/PerfilPage';
import { VentasPage } from './pages/VentasPage';

function RequireSuperAdmin({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/" replace />;
  if (user.rolNombre !== 'SuperAdmin') {
    return <Navigate to="/" replace />;
  }
  return <>{children}</>;
}

/** Cajero: solo `#/ventas`, `#/ventas/:id` y `#/perfil`; el resto redirige a ventas. */
function CajeroRouteGate() {
  const { user } = useAuth();
  const { pathname } = useLocation();
  if (!user || user.rolNombre !== 'Cajero') {
    return <Outlet />;
  }
  const p = pathname.replace(/\/+$/, '') || '/';
  if (p === '/perfil' || p === '/ventas' || p.startsWith('/ventas/')) {
    return <Outlet />;
  }
  return <Navigate to="/ventas" replace />;
}

function AppRoutes() {
  return (
    <HashRouter>
      <Routes>
        <Route path="print/venta/:id" element={<VentaPrintTicketPage />} />
        <Route element={<AppShell />}>
          <Route element={<CajeroRouteGate />}>
            <Route index element={<HomePage />} />
            <Route path="productos/:id" element={<ProductoDetallePage />} />
            <Route path="productos" element={<ProductosPage />} />
            <Route path="proveedores" element={<ProveedoresPage />} />
            <Route
              path="usuarios"
              element={
                <RequireSuperAdmin>
                  <UsuariosPage />
                </RequireSuperAdmin>
              }
            />
            <Route path="ventas/:id" element={<VentaDetallePage />} />
            <Route path="ventas" element={<VentasPage />} />
            <Route path="gastos" element={<GastosPage />} />
            <Route path="perfil" element={<PerfilPage />} />
            <Route path="configuracion" element={<ConfiguracionPage />} />
          </Route>
        </Route>
      </Routes>
    </HashRouter>
  );
}

export default function App() {
  const { user, ready } = useAuth();

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div
          className="h-10 w-10 animate-spin rounded-full border-2 border-primary border-t-transparent"
          aria-hidden
        />
      </div>
    );
  }

  if (!user) {
    return <LoginPage />;
  }

  return <AppRoutes />;
}
