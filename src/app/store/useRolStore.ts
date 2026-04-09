import { create } from 'zustand';
import { toast } from 'sonner';

import {
  defaultRolListFilters,
  type Rol,
  type RolInput,
  type RolListFilters,
  type RolListPagedParams,
} from '@/types/electron';

const NO_ELECTRON_TOAST = 'Ejecuta la app con Electron (npm run dev:electron).';

function getApi() {
  if (typeof window !== 'undefined' && window.api?.rol) {
    return window.api.rol;
  }
  return null;
}

function listParams(page: number, pageSize: number, filters: RolListFilters): RolListPagedParams {
  return { page, pageSize, ...filters };
}

interface RolStore {
  roles: Rol[];
  total: number;
  page: number;
  pageSize: number;
  listFilters: RolListFilters;
  loading: boolean;
  listLoadOk: boolean;
  error: string | null;
  fetchRoles: (options?: { silent?: boolean; page?: number; pageSize?: number }) => Promise<void>;
  applyListFilters: (filters: RolListFilters) => Promise<void>;
  resetListFilters: () => Promise<void>;
  setPage: (page: number) => Promise<void>;
  setPageSize: (pageSize: number) => Promise<void>;
  clearError: () => void;
  createRol: (data: RolInput) => Promise<boolean>;
  updateRol: (id: number, data: RolInput) => Promise<boolean>;
  deleteRol: (id: number) => Promise<boolean>;
}

export const useRolStore = create<RolStore>((set, get) => ({
  roles: [],
  total: 0,
  page: 1,
  pageSize: 10,
  listFilters: { ...defaultRolListFilters },
  loading: false,
  listLoadOk: false,
  error: null,

  clearError: () => set({ error: null }),

  fetchRoles: async (options) => {
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
        roles: result.items,
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

  applyListFilters: async (filters: RolListFilters) => {
    set({ listFilters: { ...filters }, page: 1 });
    await get().fetchRoles({ silent: true, page: 1 });
  },

  resetListFilters: async () => {
    set({ listFilters: { ...defaultRolListFilters }, page: 1 });
    await get().fetchRoles({ silent: true, page: 1 });
  },

  setPage: async (page: number) => {
    const p = Math.max(1, Math.floor(page));
    await get().fetchRoles({ page: p, silent: true });
  },

  setPageSize: async (size: number) => {
    const s = Math.min(100, Math.max(1, Math.floor(size)));
    await get().fetchRoles({ page: 1, pageSize: s, silent: true });
  },

  createRol: async (data) => {
    const api = getApi();
    if (!api) {
      toast.error(NO_ELECTRON_TOAST);
      return false;
    }
    set({ error: null });
    try {
      await api.create(data);
      await get().fetchRoles({ silent: true });
      toast.success('Rol creado');
      return true;
    } catch (err) {
      const msg = (err as Error).message;
      set({ error: msg });
      toast.error('No se pudo crear el rol', { description: msg });
      return false;
    }
  },

  updateRol: async (id, data) => {
    const api = getApi();
    if (!api) {
      toast.error(NO_ELECTRON_TOAST);
      return false;
    }
    set({ error: null });
    try {
      await api.update(id, data);
      await get().fetchRoles({ silent: true });
      toast.success('Rol actualizado');
      return true;
    } catch (err) {
      const msg = (err as Error).message;
      set({ error: msg });
      toast.error('No se pudo actualizar el rol', { description: msg });
      return false;
    }
  },

  deleteRol: async (id) => {
    const api = getApi();
    if (!api) {
      toast.error(NO_ELECTRON_TOAST);
      return false;
    }
    set({ error: null });
    try {
      await api.delete(id);
      await get().fetchRoles({ silent: true });
      toast.success('Rol eliminado');
      return true;
    } catch (err) {
      const msg = (err as Error).message;
      set({ error: msg });
      toast.error('No se pudo eliminar el rol', { description: msg });
      return false;
    }
  },
}));
