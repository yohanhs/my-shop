export interface Producto {
  id: number;
  nombre: string;
  sku: string;
  descripcion: string | null;
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

export type ProductoStatusFilter = '' | 'ACTIVE' | 'INACTIVE';

/** Filtros del listado paginado (texto vacío = sin filtrar ese campo). */
export interface ProductoListFilters {
  nombre: string;
  sku: string;
  status: ProductoStatusFilter;
  /** Fecha local YYYY-MM-DD */
  createdFrom: string;
  createdTo: string;
  updatedFrom: string;
  updatedTo: string;
}

export const defaultProductoListFilters: ProductoListFilters = {
  nombre: '',
  sku: '',
  status: '',
  createdFrom: '',
  createdTo: '',
  updatedFrom: '',
  updatedTo: '',
};

export interface ProductoListPagedResult {
  items: Producto[];
  total: number;
  page: number;
  pageSize: number;
}

export type ProductoListPagedParams = {
  page: number;
  pageSize: number;
} & ProductoListFilters;

export interface ProductoApi {
  listPaged: (params: ProductoListPagedParams) => Promise<ProductoListPagedResult>;
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

export {};
