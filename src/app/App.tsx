import { HashRouter, Route, Routes } from 'react-router-dom';

import { AppShell } from './components/layout/AppShell';
import { HomePage } from './pages/HomePage';
import { GastosPage } from './pages/GastosPage';
import { ProductoDetallePage } from './pages/ProductoDetallePage';
import { ProductosPage } from './pages/ProductosPage';
import { ConfiguracionPage } from './pages/ConfiguracionPage';
import { ProveedoresPage } from './pages/ProveedoresPage';
import { RolesPage } from './pages/RolesPage';
import { UsuariosPage } from './pages/UsuariosPage';
import { VentaDetallePage } from './pages/VentaDetallePage';
import { VentasPage } from './pages/VentasPage';

export default function App() {
  return (
    <HashRouter>
      <Routes>
        <Route element={<AppShell />}>
          <Route index element={<HomePage />} />
          <Route path="productos/:id" element={<ProductoDetallePage />} />
          <Route path="productos" element={<ProductosPage />} />
          <Route path="proveedores" element={<ProveedoresPage />} />
          <Route path="usuarios" element={<UsuariosPage />} />
          <Route path="roles" element={<RolesPage />} />
          <Route path="ventas/:id" element={<VentaDetallePage />} />
          <Route path="ventas" element={<VentasPage />} />
          <Route path="gastos" element={<GastosPage />} />
          <Route path="configuracion" element={<ConfiguracionPage />} />
        </Route>
      </Routes>
    </HashRouter>
  );
}
