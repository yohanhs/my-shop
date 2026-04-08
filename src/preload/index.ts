import { contextBridge, ipcRenderer } from 'electron';

export interface ProductoInput {
  nombre: string;
  sku: string;
  precioCosto: number;
  precioVenta: number;
  stockActual?: number;
  stockMinimo?: number;
  imagenPath?: string;
}

export interface ProductoUpdateInput {
  nombre?: string;
  sku?: string;
  precioCosto?: number;
  precioVenta?: number;
  stockActual?: number;
  stockMinimo?: number;
  imagenPath?: string;
  status?: string;
}

const productoApi = {
  getAll: () => ipcRenderer.invoke('producto:getAll'),
  getById: (id: number) => ipcRenderer.invoke('producto:getById', id),
  create: (data: ProductoInput) => ipcRenderer.invoke('producto:create', data),
  update: (id: number, data: ProductoUpdateInput) => ipcRenderer.invoke('producto:update', id, data),
  delete: (id: number) => ipcRenderer.invoke('producto:delete', id),
};

contextBridge.exposeInMainWorld('api', {
  producto: productoApi,
});
