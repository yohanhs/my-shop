export interface Producto {
  id: number;
  nombre: string;
  sku: string;
  precioCosto: number;
  precioVenta: number;
  stockActual: number;
  stockMinimo: number;
  imagenPath: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
}

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

export interface ProductoApi {
  getAll: () => Promise<Producto[]>;
  getById: (id: number) => Promise<Producto | null>;
  create: (data: ProductoInput) => Promise<Producto>;
  update: (id: number, data: ProductoUpdateInput) => Promise<Producto>;
  delete: (id: number) => Promise<Producto>;
}

export interface ElectronApi {
  producto: ProductoApi;
}

declare global {
  interface Window {
    api: ElectronApi;
  }
}
