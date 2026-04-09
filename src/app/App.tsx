import { HashRouter, Route, Routes } from 'react-router-dom';

import { AppShell } from './components/layout/AppShell';
import { HomePage } from './pages/HomePage';
import { PlaceholderPage } from './pages/PlaceholderPage';
import { ProductoDetallePage } from './pages/ProductoDetallePage';
import { ProductosPage } from './pages/ProductosPage';

export default function App() {
  return (
    <HashRouter>
      <Routes>
        <Route element={<AppShell />}>
          <Route index element={<HomePage />} />
          <Route path="productos/:id" element={<ProductoDetallePage />} />
          <Route path="productos" element={<ProductosPage />} />
          <Route
            path="ventas"
            element={<PlaceholderPage title="Ventas" description="Aquí podrás registrar y consultar ventas." />}
          />
          <Route
            path="gastos"
            element={<PlaceholderPage title="Gastos" description="Aquí podrás llevar el control de egresos." />}
          />
          <Route
            path="configuracion"
            element={
              <PlaceholderPage
                title="Configuración"
                description="Datos de la tienda, moneda e impuestos."
              />
            }
          />
        </Route>
      </Routes>
    </HashRouter>
  );
}
