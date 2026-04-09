import { create } from 'zustand';
import {
  defaultProductoListFilters,
  type Producto,
  type ProductoInput,
  type ProductoListFilters,
  type ProductoListPagedParams,
  type ProductoUpdateInput,
} from '@/types/electron';

function getApi() {
  if (typeof window !== 'undefined' && window.api?.producto) {
    return window.api.producto;
  }
  return null;
}

function listParams(page: number, pageSize: number, filters: ProductoListFilters): ProductoListPagedParams {
  return {
    page,
    pageSize,
    ...filters,
  };
}

interface ProductStore {
  productos: Producto[];
  total: number;
  page: number;
  pageSize: number;
  listFilters: ProductoListFilters;
  loading: boolean;
  /** true después de al menos un listado exitoso (incluye recargas silenciosas) */
  listLoadOk: boolean;
  error: string | null;
  fetchProductos: (options?: { silent?: boolean; page?: number; pageSize?: number }) => Promise<void>;
  applyListFilters: (filters: ProductoListFilters) => Promise<void>;
  resetListFilters: () => Promise<void>;
  setPage: (page: number) => Promise<void>;
  setPageSize: (pageSize: number) => Promise<void>;
  clearError: () => void;
  createProducto: (data: ProductoInput) => Promise<boolean>;
  updateProducto: (id: number, data: ProductoUpdateInput) => Promise<boolean>;
  deleteProducto: (id: number) => Promise<boolean>;
}

export const useProductStore = create<ProductStore>((set, get) => ({
  productos: [],
  total: 0,
  page: 1,
  pageSize: 10,
  listFilters: { ...defaultProductoListFilters },
  loading: false,
  listLoadOk: false,
  error: null,

  clearError: () => set({ error: null }),

  fetchProductos: async (options) => {
    const api = getApi();
    if (!api) {
      set({
        error: 'La app debe ejecutarse dentro de Electron. Usa: npm run dev:electron',
        loading: false,
      });
      return;
    }
    const silent = options?.silent === true;
    const pageSize = options?.pageSize ?? get().pageSize;
    let requestPage = options?.page ?? get().page;
    requestPage = Math.max(1, Math.floor(requestPage));
    const filters = get().listFilters;

    if (!silent) set({ loading: true, error: null });

    try {
      const baseParams = listParams(requestPage, pageSize, filters);
      let result = await api.listPaged(baseParams);
      const total = result.total;
      const lastPage = Math.max(1, Math.ceil(total / pageSize) || 1);
      let effectivePage = Math.min(requestPage, lastPage);

      if (effectivePage !== requestPage && total > 0) {
        result = await api.listPaged(listParams(effectivePage, pageSize, filters));
      }

      set({
        productos: result.items,
        total: result.total,
        page: effectivePage,
        pageSize,
        loading: false,
        error: null,
        listLoadOk: true,
      });
    } catch (err) {
      set({ error: (err as Error).message, loading: false });
    }
  },

  applyListFilters: async (filters: ProductoListFilters) => {
    set({ listFilters: { ...filters }, page: 1 });
    await get().fetchProductos({ silent: true, page: 1 });
  },

  resetListFilters: async () => {
    set({ listFilters: { ...defaultProductoListFilters }, page: 1 });
    await get().fetchProductos({ silent: true, page: 1 });
  },

  setPage: async (page: number) => {
    const p = Math.max(1, Math.floor(page));
    await get().fetchProductos({ page: p, silent: true });
  },

  setPageSize: async (size: number) => {
    const s = Math.min(100, Math.max(1, Math.floor(size)));
    await get().fetchProductos({ page: 1, pageSize: s, silent: true });
  },

  createProducto: async (data) => {
    const api = getApi();
    if (!api) return false;
    set({ error: null });
    try {
      await api.create(data);
      await get().fetchProductos({ silent: true });
      return true;
    } catch (err) {
      set({ error: (err as Error).message });
      return false;
    }
  },

  updateProducto: async (id, data) => {
    const api = getApi();
    if (!api) return false;
    set({ error: null });
    try {
      await api.update(id, data);
      await get().fetchProductos({ silent: true });
      return true;
    } catch (err) {
      set({ error: (err as Error).message });
      return false;
    }
  },

  deleteProducto: async (id) => {
    const api = getApi();
    if (!api) return false;
    set({ error: null });
    try {
      await api.delete(id);
      await get().fetchProductos({ silent: true });
      return true;
    } catch (err) {
      set({ error: (err as Error).message });
      return false;
    }
  },
}));
