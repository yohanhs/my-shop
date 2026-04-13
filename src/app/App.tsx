import { HashRouter, Navigate, Outlet, Route, Routes, useLocation } from 'react-router-dom';

import { AppShell } from './components/layout/AppShell';
import { ShopAppBackground } from './components/layout/ShopAppBackground';
import { LoginPage } from './pages/LoginPage';
import { useAuth } from './providers/AuthProvider';
import { HomePage } from './pages/HomePage';
import { GastosPage } from './pages/GastosPage';
import { MermasPage } from './pages/MermasPage';
import { ProductoDetallePage } from './pages/ProductoDetallePage';
import { ProductosPage } from './pages/ProductosPage';
import { ConfiguracionPage } from './pages/ConfiguracionPage';
import { ProveedoresPage } from './pages/ProveedoresPage';
import { UsuariosPage } from './pages/UsuariosPage';
import { VentaDetallePage } from './pages/VentaDetallePage';
import { VentaPrintTicketPage } from './pages/VentaPrintTicketPage';
import { PerfilPage } from './pages/PerfilPage';
import { VentasPage } from './pages/VentasPage';
import { VentaCajaPage } from './pages/VentaCajaPage';
import { cajeroCanAccessPathname, isCajeroRole } from './lib/cajeroAccess';

function RequireSuperAdmin({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/" replace />;
  if (user.rolNombre !== 'SuperAdmin') {
    return <Navigate to="/" replace />;
  }
  return <>{children}</>;
}

/** Cajero: ventas, caja (`#/caja/…`), perfil; el resto redirige a ventas. */
function CajeroRouteGate() {
  const { user } = useAuth();
  const { pathname } = useLocation();
  if (!user || !isCajeroRole(user.rolNombre)) {
    return <Outlet />;
  }
  if (cajeroCanAccessPathname(pathname)) {
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
            <Route path="ventas/caja" element={<Navigate to="/caja/ventas" replace />} />
            <Route path="caja/ventas" element={<VentaCajaPage />} />
            <Route path="ventas/:id" element={<VentaDetallePage />} />
            <Route path="ventas" element={<VentasPage />} />
            <Route path="gastos" element={<GastosPage />} />
            <Route path="mermas" element={<MermasPage />} />
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
      <div className="relative isolate flex min-h-screen items-center justify-center">
        <ShopAppBackground />
        <div
          className="relative z-10 h-10 w-10 animate-spin rounded-full border-2 border-primary border-t-transparent"
          aria-hidden
        />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="relative isolate min-h-screen">
        <ShopAppBackground />
        <LoginPage />
      </div>
    );
  }

  return (
    <div className="relative isolate min-h-screen">
      <ShopAppBackground />
      <AppRoutes />
    </div>
  );
}
