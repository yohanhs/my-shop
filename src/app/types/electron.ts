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

// ─── Rol ─────────────────────────────────────────────────────────────────

export interface Rol {
  id: number;
  nombre: string;
}

export interface RolInput {
  nombre: string;
}

export interface RolListFilters {
  nombre: string;
}

export const defaultRolListFilters: RolListFilters = {
  nombre: '',
};

export interface RolListPagedResult {
  items: Rol[];
  total: number;
  page: number;
  pageSize: number;
}

export type RolListPagedParams = {
  page: number;
  pageSize: number;
} & RolListFilters;

export interface RolApi {
  listPaged: (params: RolListPagedParams) => Promise<RolListPagedResult>;
  listAll: () => Promise<Rol[]>;
  getById: (id: number) => Promise<Rol | null>;
  create: (data: RolInput) => Promise<Rol>;
  update: (id: number, data: RolInput) => Promise<Rol>;
  delete: (id: number) => Promise<Rol>;
}

// ─── Usuario (sin password en respuestas) ─────────────────────────────────

export interface Usuario {
  id: number;
  nombre: string;
  username: string;
  status: string;
  rolId: number;
  rolNombre: string;
  createdAt: string;
  updatedAt: string;
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
  /** Si se omite o va vacío, no se cambia la contraseña. */
  password?: string;
  rolId?: number;
  status?: string;
}

export type UsuarioStatusFilter = '' | 'ACTIVE' | 'INACTIVE';

export interface UsuarioListFilters {
  nombre: string;
  username: string;
  status: UsuarioStatusFilter;
  /** vacío = todos los roles */
  rolId: string;
  createdFrom: string;
  createdTo: string;
  updatedFrom: string;
  updatedTo: string;
}

export const defaultUsuarioListFilters: UsuarioListFilters = {
  nombre: '',
  username: '',
  status: '',
  rolId: '',
  createdFrom: '',
  createdTo: '',
  updatedFrom: '',
  updatedTo: '',
};

export interface UsuarioListPagedResult {
  items: Usuario[];
  total: number;
  page: number;
  pageSize: number;
}

export type UsuarioListPagedParams = {
  page: number;
  pageSize: number;
} & UsuarioListFilters;

export interface UsuarioApi {
  listPaged: (params: UsuarioListPagedParams) => Promise<UsuarioListPagedResult>;
  getById: (id: number) => Promise<Usuario | null>;
  create: (data: UsuarioInput) => Promise<Usuario>;
  update: (id: number, data: UsuarioUpdateInput) => Promise<Usuario>;
  delete: (id: number) => Promise<void>;
}

export interface ElectronApi {
  producto: ProductoApi;
  rol: RolApi;
  usuario: UsuarioApi;
}

declare global {
  interface Window {
    api: ElectronApi;
  }
}

export {};
