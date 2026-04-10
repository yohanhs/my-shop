import { create } from 'zustand';
import { toast } from 'sonner';

import {
  defaultGastoListFilters,
  type Gasto,
  type GastoInput,
  type GastoListFilters,
  type GastoListPagedParams,
  type GastoUpdateInput,
} from '@/types/electron';

const NO_ELECTRON_TOAST = 'Ejecuta la app con Electron (npm run dev:electron).';

function getApi() {
  if (typeof window !== 'undefined' && window.api?.gasto) {
    return window.api.gasto;
  }
  return null;
}

function listParams(page: number, pageSize: number, filters: GastoListFilters): GastoListPagedParams {
  return { page, pageSize, ...filters };
}

interface GastoStore {
  gastos: Gasto[];
  total: number;
  page: number;
  pageSize: number;
  listFilters: GastoListFilters;
  loading: boolean;
  listLoadOk: boolean;
  error: string | null;
  fetchGastos: (options?: { silent?: boolean; page?: number; pageSize?: number }) => Promise<void>;
  applyListFilters: (filters: GastoListFilters) => Promise<void>;
  resetListFilters: () => Promise<void>;
  setPage: (page: number) => Promise<void>;
  setPageSize: (pageSize: number) => Promise<void>;
  clearError: () => void;
  createGasto: (data: GastoInput) => Promise<boolean>;
  updateGasto: (id: number, data: GastoUpdateInput) => Promise<boolean>;
  deleteGasto: (id: number) => Promise<boolean>;
}

export const useGastoStore = create<GastoStore>((set, get) => ({
  gastos: [],
  total: 0,
  page: 1,
  pageSize: 10,
  listFilters: { ...defaultGastoListFilters },
  loading: false,
  listLoadOk: false,
  error: null,

  clearError: () => set({ error: null }),

  fetchGastos: async (options) => {
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
        gastos: result.items,
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

  applyListFilters: async (filters) => {
    set({ listFilters: { ...filters }, page: 1 });
    await get().fetchGastos({ silent: true, page: 1 });
  },

  resetListFilters: async () => {
    set({ listFilters: { ...defaultGastoListFilters }, page: 1 });
    await get().fetchGastos({ silent: true, page: 1 });
  },

  setPage: async (page) => {
    const p = Math.max(1, Math.floor(page));
    await get().fetchGastos({ page: p, silent: true });
  },

  setPageSize: async (size) => {
    const s = Math.min(100, Math.max(1, Math.floor(size)));
    await get().fetchGastos({ page: 1, pageSize: s, silent: true });
  },

  createGasto: async (data) => {
    const api = getApi();
    if (!api) {
      toast.error(NO_ELECTRON_TOAST);
      return false;
    }
    set({ error: null });
    try {
      await api.create(data);
      await get().fetchGastos({ silent: true });
      toast.success('Gasto registrado');
      return true;
    } catch (err) {
      const msg = (err as Error).message;
      set({ error: msg });
      toast.error('No se pudo registrar el gasto', { description: msg });
      return false;
    }
  },

  updateGasto: async (id, data) => {
    const api = getApi();
    if (!api) {
      toast.error(NO_ELECTRON_TOAST);
      return false;
    }
    set({ error: null });
    try {
      await api.update(id, data);
      await get().fetchGastos({ silent: true });
      toast.success('Gasto actualizado');
      return true;
    } catch (err) {
      const msg = (err as Error).message;
      set({ error: msg });
      toast.error('No se pudo actualizar el gasto', { description: msg });
      return false;
    }
  },

  deleteGasto: async (id) => {
    const api = getApi();
    if (!api) {
      toast.error(NO_ELECTRON_TOAST);
      return false;
    }
    set({ error: null });
    try {
      await api.delete(id);
      await get().fetchGastos({ silent: true });
      toast.success('Gasto eliminado');
      return true;
    } catch (err) {
      const msg = (err as Error).message;
      set({ error: msg });
      toast.error('No se pudo eliminar el gasto', { description: msg });
      return false;
    }
  },
}));
