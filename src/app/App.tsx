import { useEffect } from 'react';
import { useProductStore } from './store/useProductStore';
import { ProductosPage } from './pages/ProductosPage';

export default function App() {
  const fetchProductos = useProductStore((s) => s.fetchProductos);

  useEffect(() => {
    fetchProductos();
  }, [fetchProductos]);

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <h1 className="text-2xl font-bold text-gray-900">Mi Tienda</h1>
        </div>
      </header>
      <main className="max-w-7xl mx-auto px-4 py-6">
        <ProductosPage />
      </main>
    </div>
  );
}
