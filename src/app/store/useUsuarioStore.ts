import { create } from 'zustand';
import { toast } from 'sonner';

import {
  defaultUsuarioListFilters,
  type Usuario,
  type UsuarioInput,
  type UsuarioListFilters,
  type UsuarioListPagedParams,
  type UsuarioUpdateInput,
} from '@/types/electron';

const NO_ELECTRON_TOAST = 'Ejecuta la app con Electron (npm run dev:electron).';

function getApi() {
  if (typeof window !== 'undefined' && window.api?.usuario) {
    return window.api.usuario;
  }
  return null;
}

function listParams(page: number, pageSize: number, filters: UsuarioListFilters): UsuarioListPagedParams {
  return { page, pageSize, ...filters };
}

interface UsuarioStore {
  usuarios: Usuario[];
  total: number;
  page: number;
  pageSize: number;
  listFilters: UsuarioListFilters;
  loading: boolean;
  listLoadOk: boolean;
  error: string | null;
  fetchUsuarios: (options?: { silent?: boolean; page?: number; pageSize?: number }) => Promise<void>;
  applyListFilters: (filters: UsuarioListFilters) => Promise<void>;
  resetListFilters: () => Promise<void>;
  setPage: (page: number) => Promise<void>;
  setPageSize: (pageSize: number) => Promise<void>;
  clearError: () => void;
  createUsuario: (data: UsuarioInput) => Promise<boolean>;
  updateUsuario: (id: number, data: UsuarioUpdateInput) => Promise<boolean>;
  deleteUsuario: (id: number) => Promise<boolean>;
}

export const useUsuarioStore = create<UsuarioStore>((set, get) => ({
  usuarios: [],
  total: 0,
  page: 1,
  pageSize: 10,
  listFilters: { ...defaultUsuarioListFilters },
  loading: false,
  listLoadOk: false,
  error: null,

  clearError: () => set({ error: null }),

  fetchUsuarios: async (options) => {
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
        usuarios: result.items,
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

  applyListFilters: async (filters: UsuarioListFilters) => {
    set({ listFilters: { ...filters }, page: 1 });
    await get().fetchUsuarios({ silent: true, page: 1 });
  },

  resetListFilters: async () => {
    set({ listFilters: { ...defaultUsuarioListFilters }, page: 1 });
    await get().fetchUsuarios({ silent: true, page: 1 });
  },

  setPage: async (page: number) => {
    const p = Math.max(1, Math.floor(page));
    await get().fetchUsuarios({ page: p, silent: true });
  },

  setPageSize: async (size: number) => {
    const s = Math.min(100, Math.max(1, Math.floor(size)));
    await get().fetchUsuarios({ page: 1, pageSize: s, silent: true });
  },

  createUsuario: async (data) => {
    const api = getApi();
    if (!api) {
      toast.error(NO_ELECTRON_TOAST);
      return false;
    }
    set({ error: null });
    try {
      await api.create(data);
      await get().fetchUsuarios({ silent: true });
      toast.success('Usuario creado');
      return true;
    } catch (err) {
      const msg = (err as Error).message;
      set({ error: msg });
      toast.error('No se pudo crear el usuario', { description: msg });
      return false;
    }
  },

  updateUsuario: async (id, data) => {
    const api = getApi();
    if (!api) {
      toast.error(NO_ELECTRON_TOAST);
      return false;
    }
    set({ error: null });
    try {
      await api.update(id, data);
      await get().fetchUsuarios({ silent: true });
      toast.success('Usuario actualizado');
      return true;
    } catch (err) {
      const msg = (err as Error).message;
      set({ error: msg });
      toast.error('No se pudo actualizar el usuario', { description: msg });
      return false;
    }
  },

  deleteUsuario: async (id) => {
    const api = getApi();
    if (!api) {
      toast.error(NO_ELECTRON_TOAST);
      return false;
    }
    set({ error: null });
    try {
      await api.delete(id);
      await get().fetchUsuarios({ silent: true });
      toast.success('Usuario eliminado');
      return true;
    } catch (err) {
      const msg = (err as Error).message;
      set({ error: msg });
      toast.error('No se pudo eliminar el usuario', { description: msg });
      return false;
    }
  },
}));
