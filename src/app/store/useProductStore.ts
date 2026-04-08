import { create } from 'zustand';
import type { Producto, ProductoInput, ProductoUpdateInput } from '../types/electron';

function getApi() {
  if (typeof window !== 'undefined' && window.api?.producto) {
    return window.api.producto;
  }
  return null;
}

interface ProductStore {
  productos: Producto[];
  loading: boolean;
  error: string | null;
  fetchProductos: () => Promise<void>;
  createProducto: (data: ProductoInput) => Promise<void>;
  updateProducto: (id: number, data: ProductoUpdateInput) => Promise<void>;
  deleteProducto: (id: number) => Promise<void>;
}

export const useProductStore = create<ProductStore>((set, get) => ({
  productos: [],
  loading: false,
  error: null,

  fetchProductos: async () => {
    const api = getApi();
    if (!api) {
      set({ error: 'La app debe ejecutarse dentro de Electron. Usa: npm run dev:electron', loading: false });
      return;
    }
    set({ loading: true, error: null });
    try {
      const productos = await api.getAll();
      set({ productos, loading: false });
    } catch (err) {
      set({ error: (err as Error).message, loading: false });
    }
  },

  createProducto: async (data) => {
    const api = getApi();
    if (!api) return;
    set({ loading: true, error: null });
    try {
      await api.create(data);
      await get().fetchProductos();
    } catch (err) {
      set({ error: (err as Error).message, loading: false });
    }
  },

  updateProducto: async (id, data) => {
    const api = getApi();
    if (!api) return;
    set({ loading: true, error: null });
    try {
      await api.update(id, data);
      await get().fetchProductos();
    } catch (err) {
      set({ error: (err as Error).message, loading: false });
    }
  },

  deleteProducto: async (id) => {
    const api = getApi();
    if (!api) return;
    set({ loading: true, error: null });
    try {
      await api.delete(id);
      await get().fetchProductos();
    } catch (err) {
      set({ error: (err as Error).message, loading: false });
    }
  },
}));
