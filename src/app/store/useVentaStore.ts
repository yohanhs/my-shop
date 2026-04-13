import { create } from 'zustand';
import { toast } from 'sonner';

import { useProductStore } from '@/store/useProductStore';
import {
  defaultProductoListFilters,
  defaultVentaListFilters,
  type Producto,
  type VentaConDetalles,
  type VentaCreateInput,
  type VentaListFilters,
  type VentaListItem,
  type VentaListPagedParams,
} from '@/types/electron';

const NO_ELECTRON_TOAST = 'Ejecuta la app con Electron (npm run dev:electron).';

function getApi() {
  if (typeof window !== 'undefined' && window.api?.venta) {
    return window.api.venta;
  }
  return null;
}

function listParams(page: number, pageSize: number, filters: VentaListFilters): VentaListPagedParams {
  return { page, pageSize, ...filters };
}

interface VentaStore {
  ventas: VentaListItem[];
  total: number;
  page: number;
  pageSize: number;
  listFilters: VentaListFilters;
  loading: boolean;
  listLoadOk: boolean;
  error: string | null;
  fetchVentas: (options?: { silent?: boolean; page?: number; pageSize?: number }) => Promise<void>;
  applyListFilters: (filters: VentaListFilters) => Promise<void>;
  resetListFilters: () => Promise<void>;
  setPage: (page: number) => Promise<void>;
  setPageSize: (pageSize: number) => Promise<void>;
  clearError: () => void;
  createVenta: (data: VentaCreateInput) => Promise<VentaConDetalles | null>;
  updateVenta: (id: number, data: VentaCreateInput) => Promise<VentaConDetalles | null>;
  anularVenta: (id: number, usuarioId?: number) => Promise<boolean>;
}

export const useVentaStore = create<VentaStore>((set, get) => ({
  ventas: [],
  total: 0,
  page: 1,
  pageSize: 10,
  listFilters: { ...defaultVentaListFilters },
  loading: false,
  listLoadOk: false,
  error: null,

  clearError: () => set({ error: null }),

  fetchVentas: async (options) => {
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
        ventas: result.items,
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

  applyListFilters: async (filters: VentaListFilters) => {
    set({ listFilters: { ...filters }, page: 1 });
    await get().fetchVentas({ silent: true, page: 1 });
  },

  resetListFilters: async () => {
    set({ listFilters: { ...defaultVentaListFilters }, page: 1 });
    await get().fetchVentas({ silent: true, page: 1 });
  },

  setPage: async (page: number) => {
    const p = Math.max(1, Math.floor(page));
    await get().fetchVentas({ page: p, silent: true });
  },

  setPageSize: async (size: number) => {
    const s = Math.min(100, Math.max(1, Math.floor(size)));
    await get().fetchVentas({ page: 1, pageSize: s, silent: true });
  },

  createVenta: async (data) => {
    const api = getApi();
    if (!api) {
      toast.error(NO_ELECTRON_TOAST);
      return null;
    }
    set({ error: null });
    try {
      const created = await api.create(data);
      await get().fetchVentas({ silent: true });
      await useProductStore.getState().fetchProductos({ silent: true });
      toast.success('Venta registrada');
      return created;
    } catch (err) {
      const msg = (err as Error).message;
      set({ error: msg });
      toast.error('No se pudo registrar la venta', { description: msg });
      return null;
    }
  },

  updateVenta: async (id, data) => {
    const api = getApi();
    if (!api) {
      toast.error(NO_ELECTRON_TOAST);
      return null;
    }
    set({ error: null });
    try {
      const updated = await api.update(id, data);
      await get().fetchVentas({ silent: true });
      await useProductStore.getState().fetchProductos({ silent: true });
      toast.success('Venta actualizada');
      return updated;
    } catch (err) {
      const msg = (err as Error).message;
      set({ error: msg });
      toast.error('No se pudo actualizar la venta', { description: msg });
      return null;
    }
  },

  anularVenta: async (id, usuarioId) => {
    const api = getApi();
    if (!api) {
      toast.error(NO_ELECTRON_TOAST);
      return false;
    }
    set({ error: null });
    try {
      await api.anular(id, usuarioId);
      await get().fetchVentas({ silent: true });
      await useProductStore.getState().fetchProductos({ silent: true });
      toast.success('Venta anulada');
      return true;
    } catch (err) {
      const msg = (err as Error).message;
      set({ error: msg });
      toast.error('No se pudo anular la venta', { description: msg });
      return false;
    }
  },
}));

export async function loadProductosParaVenta(): Promise<Producto[]> {
  const api = typeof window !== 'undefined' ? window.api?.producto : undefined;
  if (!api) return [];
  const params = {
    page: 1,
    pageSize: 500,
    ...defaultProductoListFilters,
  };
  try {
    const r = await api.listPaged(params);
    return r.items.filter((p) => p.status === 'ACTIVE' && p.stockActual > 0);
  } catch {
    return [];
  }
}

/** Incluye productos activos del listado y, al editar, los que faltan (p. ej. inactivos) por id. */
export async function loadProductosParaVentaEditor(
  lineas?: { productoId: number }[],
): Promise<Producto[]> {
  const base = await loadProductosParaVenta();
  const api = typeof window !== 'undefined' ? window.api?.producto : undefined;
  if (!api || !lineas?.length) return base;
  const ids = [...new Set(lineas.map((l) => l.productoId).filter((id) => id > 0))];
  const missing = ids.filter((id) => !base.some((p) => p.id === id));
  const extras = (await Promise.all(missing.map((id) => api.getById(id)))).filter(
    (p): p is Producto => p != null,
  );
  return [...base, ...extras];
}
