import { contextBridge, ipcRenderer } from 'electron';

export interface ProductoInput {
  nombre: string;
  sku: string;
  descripcion?: string | null;
  precioCosto: number;
  precioVenta: number;
  stockActual?: number;
  stockMinimo?: number;
  imagenPath?: string;
}

export interface ProductoUpdateInput {
  nombre?: string;
  sku?: string;
  descripcion?: string | null;
  precioCosto?: number;
  precioVenta?: number;
  stockActual?: number;
  stockMinimo?: number;
  imagenPath?: string;
  status?: string;
}

export interface RolInput {
  nombre: string;
}

export interface UsuarioInput {
  nombre: string;
  username: string;
  password: string;
  rolId: number;
  status?: string;
}

export interface UsuarioUpdateInput {
  nombre?: string;
  username?: string;
  password?: string;
  rolId?: number;
  status?: string;
}

const productoApi = {
  listPaged: (params: Record<string, unknown>) => ipcRenderer.invoke('producto:listPaged', params),
  getById: (id: number) => ipcRenderer.invoke('producto:getById', id),
  create: (data: ProductoInput) => ipcRenderer.invoke('producto:create', data),
  update: (id: number, data: ProductoUpdateInput) => ipcRenderer.invoke('producto:update', id, data),
  delete: (id: number) => ipcRenderer.invoke('producto:delete', id),
};

const rolApi = {
  listPaged: (params: Record<string, unknown>) => ipcRenderer.invoke('rol:listPaged', params),
  listAll: () => ipcRenderer.invoke('rol:listAll'),
  getById: (id: number) => ipcRenderer.invoke('rol:getById', id),
  create: (data: RolInput) => ipcRenderer.invoke('rol:create', data),
  update: (id: number, data: RolInput) => ipcRenderer.invoke('rol:update', id, data),
  delete: (id: number) => ipcRenderer.invoke('rol:delete', id),
};

const usuarioApi = {
  listPaged: (params: Record<string, unknown>) => ipcRenderer.invoke('usuario:listPaged', params),
  getById: (id: number) => ipcRenderer.invoke('usuario:getById', id),
  create: (data: UsuarioInput) => ipcRenderer.invoke('usuario:create', data),
  update: (id: number, data: UsuarioUpdateInput) => ipcRenderer.invoke('usuario:update', id, data),
  delete: (id: number) => ipcRenderer.invoke('usuario:delete', id),
};

contextBridge.exposeInMainWorld('api', {
  producto: productoApi,
  rol: rolApi,
  usuario: usuarioApi,
});
