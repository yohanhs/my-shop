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

export interface ProveedorInput {
  nombre: string;
  telefono?: string | null;
  empresa?: string | null;
  direccion?: string | null;
  email?: string | null;
}

export interface ProveedorUpdateInput {
  nombre?: string;
  telefono?: string | null;
  empresa?: string | null;
  direccion?: string | null;
  email?: string | null;
}

export interface ConfiguracionUpdateInput {
  nombreTienda?: string;
  moneda?: string;
  impuestoPorcentaje?: number;
  logoPath?: string | null;
}

export interface VentaLineaInput {
  productoId: number;
  cantidad: number;
}

export interface VentaCreateInput {
  metodoPago: string;
  ticketFolio?: string | null;
  lineas: VentaLineaInput[];
  usuarioId?: number;
}

export interface GastoInput {
  concepto: string;
  monto: number;
  fecha?: string | null;
  categoria: string;
}

export interface GastoUpdateInput {
  concepto?: string;
  monto?: number;
  fecha?: string | null;
  categoria?: string;
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

const proveedorApi = {
  listPaged: (params: Record<string, unknown>) => ipcRenderer.invoke('proveedor:listPaged', params),
  getById: (id: number) => ipcRenderer.invoke('proveedor:getById', id),
  create: (data: ProveedorInput) => ipcRenderer.invoke('proveedor:create', data),
  update: (id: number, data: ProveedorUpdateInput) => ipcRenderer.invoke('proveedor:update', id, data),
  delete: (id: number) => ipcRenderer.invoke('proveedor:delete', id),
};

const configuracionApi = {
  get: () => ipcRenderer.invoke('configuracion:get'),
  update: (id: number, data: ConfiguracionUpdateInput) =>
    ipcRenderer.invoke('configuracion:update', id, data),
};

const ventaApi = {
  listPaged: (params: Record<string, unknown>) => ipcRenderer.invoke('venta:listPaged', params),
  getById: (id: number) => ipcRenderer.invoke('venta:getById', id),
  create: (data: VentaCreateInput) => ipcRenderer.invoke('venta:create', data),
  update: (id: number, data: VentaCreateInput) => ipcRenderer.invoke('venta:update', id, data),
  anular: (id: number, usuarioId?: number) => ipcRenderer.invoke('venta:anular', id, usuarioId),
};

const gastoApi = {
  listPaged: (params: Record<string, unknown>) => ipcRenderer.invoke('gasto:listPaged', params),
  getById: (id: number) => ipcRenderer.invoke('gasto:getById', id),
  create: (data: GastoInput) => ipcRenderer.invoke('gasto:create', data),
  update: (id: number, data: GastoUpdateInput) => ipcRenderer.invoke('gasto:update', id, data),
  delete: (id: number) => ipcRenderer.invoke('gasto:delete', id),
};

contextBridge.exposeInMainWorld('api', {
  producto: productoApi,
  proveedor: proveedorApi,
  configuracion: configuracionApi,
  venta: ventaApi,
  gasto: gastoApi,
  rol: rolApi,
  usuario: usuarioApi,
});
