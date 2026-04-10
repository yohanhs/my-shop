import { create } from 'zustand';
import { toast } from 'sonner';

import {
  defaultProveedorListFilters,
  type Proveedor,
  type ProveedorInput,
  type ProveedorListFilters,
  type ProveedorListPagedParams,
  type ProveedorUpdateInput,
} from '@/types/electron';

const NO_ELECTRON_TOAST = 'Ejecuta la app con Electron (npm run dev:electron).';

function getApi() {
  if (typeof window !== 'undefined' && window.api?.proveedor) {
    return window.api.proveedor;
  }
  return null;
}

function listParams(page: number, pageSize: number, filters: ProveedorListFilters): ProveedorListPagedParams {
  return { page, pageSize, ...filters };
}

interface ProveedorStore {
  proveedores: Proveedor[];
  total: number;
  page: number;
  pageSize: number;
  listFilters: ProveedorListFilters;
  loading: boolean;
  listLoadOk: boolean;
  error: string | null;
  fetchProveedores: (options?: { silent?: boolean; page?: number; pageSize?: number }) => Promise<void>;
  applyListFilters: (filters: ProveedorListFilters) => Promise<void>;
  resetListFilters: () => Promise<void>;
  setPage: (page: number) => Promise<void>;
  setPageSize: (pageSize: number) => Promise<void>;
  clearError: () => void;
  createProveedor: (data: ProveedorInput) => Promise<boolean>;
  updateProveedor: (id: number, data: ProveedorUpdateInput) => Promise<boolean>;
  deleteProveedor: (id: number) => Promise<boolean>;
}

export const useProveedorStore = create<ProveedorStore>((set, get) => ({
  proveedores: [],
  total: 0,
  page: 1,
  pageSize: 10,
  listFilters: { ...defaultProveedorListFilters },
  loading: false,
  listLoadOk: false,
  error: null,

  clearError: () => set({ error: null }),

  fetchProveedores: async (options) => {
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
        proveedores: result.items,
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

  applyListFilters: async (filters: ProveedorListFilters) => {
    set({ listFilters: { ...filters }, page: 1 });
    await get().fetchProveedores({ silent: true, page: 1 });
  },

  resetListFilters: async () => {
    set({ listFilters: { ...defaultProveedorListFilters }, page: 1 });
    await get().fetchProveedores({ silent: true, page: 1 });
  },

  setPage: async (page: number) => {
    const p = Math.max(1, Math.floor(page));
    await get().fetchProveedores({ page: p, silent: true });
  },

  setPageSize: async (size: number) => {
    const s = Math.min(100, Math.max(1, Math.floor(size)));
    await get().fetchProveedores({ page: 1, pageSize: s, silent: true });
  },

  createProveedor: async (data) => {
    const api = getApi();
    if (!api) {
      toast.error(NO_ELECTRON_TOAST);
      return false;
    }
    set({ error: null });
    try {
      await api.create(data);
      await get().fetchProveedores({ silent: true });
      toast.success('Proveedor creado');
      return true;
    } catch (err) {
      const msg = (err as Error).message;
      set({ error: msg });
      toast.error('No se pudo crear el proveedor', { description: msg });
      return false;
    }
  },

  updateProveedor: async (id, data) => {
    const api = getApi();
    if (!api) {
      toast.error(NO_ELECTRON_TOAST);
      return false;
    }
    set({ error: null });
    try {
      await api.update(id, data);
      await get().fetchProveedores({ silent: true });
      toast.success('Proveedor actualizado');
      return true;
    } catch (err) {
      const msg = (err as Error).message;
      set({ error: msg });
      toast.error('No se pudo actualizar el proveedor', { description: msg });
      return false;
    }
  },

  deleteProveedor: async (id) => {
    const api = getApi();
    if (!api) {
      toast.error(NO_ELECTRON_TOAST);
      return false;
    }
    set({ error: null });
    try {
      await api.delete(id);
      await get().fetchProveedores({ silent: true });
      toast.success('Proveedor eliminado');
      return true;
    } catch (err) {
      const msg = (err as Error).message;
      set({ error: msg });
      toast.error('No se pudo eliminar el proveedor', { description: msg });
      return false;
    }
  },
}));
