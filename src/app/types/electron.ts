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
  /** ISO o null si no aplica. */
  fechaCaducidad: string | null;
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
  /** `YYYY-MM-DD` o vacío/null = sin caducidad. */
  fechaCaducidad?: string | null;
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
  fechaCaducidad?: string | null;
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

// ─── Proveedor ───────────────────────────────────────────────────────────

export interface Proveedor {
  id: number;
  nombre: string;
  telefono: string | null;
  empresa: string | null;
  direccion: string | null;
  email: string | null;
  createdAt: string;
  updatedAt: string;
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

export interface ProveedorListFilters {
  nombre: string;
  empresa: string;
  telefono: string;
  email: string;
  createdFrom: string;
  createdTo: string;
  updatedFrom: string;
  updatedTo: string;
}

export const defaultProveedorListFilters: ProveedorListFilters = {
  nombre: '',
  empresa: '',
  telefono: '',
  email: '',
  createdFrom: '',
  createdTo: '',
  updatedFrom: '',
  updatedTo: '',
};

export interface ProveedorListPagedResult {
  items: Proveedor[];
  total: number;
  page: number;
  pageSize: number;
}

export type ProveedorListPagedParams = {
  page: number;
  pageSize: number;
} & ProveedorListFilters;

export interface ProveedorApi {
  listPaged: (params: ProveedorListPagedParams) => Promise<ProveedorListPagedResult>;
  getById: (id: number) => Promise<Proveedor | null>;
  create: (data: ProveedorInput) => Promise<Proveedor>;
  update: (id: number, data: ProveedorUpdateInput) => Promise<Proveedor>;
  delete: (id: number) => Promise<Proveedor>;
}

// ─── Configuración (registro único) ──────────────────────────────────────

export interface Configuracion {
  id: number;
  nombreTienda: string;
  moneda: string;
  impuestoPorcentaje: number;
  logoPath: string | null;
  /** Carpeta donde se copian imágenes importadas; null = carpeta interna de la app. */
  imagenesDirDefault: string | null;
}

export interface ConfiguracionUpdateInput {
  nombreTienda?: string;
  moneda?: string;
  impuestoPorcentaje?: number;
  logoPath?: string | null;
  imagenesDirDefault?: string | null;
}

export interface ConfiguracionApi {
  get: () => Promise<Configuracion>;
  update: (id: number, data: ConfiguracionUpdateInput) => Promise<Configuracion>;
}

/** Importación de imágenes al disco (proceso principal). */
export interface FileApi {
  importImage: (sourcePath: string) => Promise<{ path: string }>;
  pickImageFile: () => Promise<string | null>;
  pickImagesDirectory: () => Promise<string | null>;
}

// ─── Venta ───────────────────────────────────────────────────────────────

export type VentaMetodoPago = 'EFECTIVO' | 'TARJETA' | 'TRANSFERENCIA';

export interface VentaLineaInput {
  productoId: number;
  cantidad: number;
}

export interface VentaCreateInput {
  metodoPago: VentaMetodoPago;
  ticketFolio?: string | null;
  lineas: VentaLineaInput[];
  usuarioId?: number;
}

export interface VentaListItem {
  id: number;
  fecha: string;
  total: number;
  metodoPago: string;
  estado: string;
  ticketFolio: string | null;
  createdAt: string;
  lineasCount: number;
}

export interface VentaDetalleItem {
  id: number;
  productoId: number;
  cantidad: number;
  precioAplicado: number;
  precioCostoUnitarioHistorico: number;
  productoNombre: string;
  productoSku: string;
}

export interface VentaConDetalles {
  id: number;
  fecha: string;
  total: number;
  metodoPago: string;
  estado: string;
  ticketFolio: string | null;
  createdAt: string;
  updatedAt: string;
  detalles: VentaDetalleItem[];
}

export type VentaEstadoFilter = '' | 'ACTIVA' | 'ANULADA';
export type VentaMetodoFilter = '' | VentaMetodoPago;

export interface VentaListFilters {
  estado: VentaEstadoFilter;
  metodoPago: VentaMetodoFilter;
  /** Fecha de venta YYYY-MM-DD */
  fechaDesde: string;
  fechaHasta: string;
  ticketFolio: string;
}

export const defaultVentaListFilters: VentaListFilters = {
  estado: '',
  metodoPago: '',
  fechaDesde: '',
  fechaHasta: '',
  ticketFolio: '',
};

export interface VentaListPagedResult {
  items: VentaListItem[];
  total: number;
  page: number;
  pageSize: number;
}

export type VentaListPagedParams = {
  page: number;
  pageSize: number;
} & VentaListFilters;

export interface VentaApi {
  listPaged: (params: VentaListPagedParams) => Promise<VentaListPagedResult>;
  getById: (id: number) => Promise<VentaConDetalles | null>;
  create: (data: VentaCreateInput) => Promise<VentaConDetalles>;
  update: (id: number, data: VentaCreateInput) => Promise<VentaConDetalles>;
  anular: (id: number, usuarioId?: number) => Promise<{ ok: boolean }>;
}

// ─── Gasto ───────────────────────────────────────────────────────────────

export interface Gasto {
  id: number;
  concepto: string;
  monto: number;
  fecha: string;
  categoria: string;
  createdAt: string;
  updatedAt: string;
}

export interface GastoInput {
  concepto: string;
  monto: number;
  /** YYYY-MM-DD o ISO; si se omite, fecha actual. */
  fecha?: string | null;
  categoria: string;
}

export interface GastoUpdateInput {
  concepto?: string;
  monto?: number;
  fecha?: string | null;
  categoria?: string;
}

export interface GastoListFilters {
  concepto: string;
  categoria: string;
  fechaDesde: string;
  fechaHasta: string;
}

export const defaultGastoListFilters: GastoListFilters = {
  concepto: '',
  categoria: '',
  fechaDesde: '',
  fechaHasta: '',
};

export interface GastoListPagedResult {
  items: Gasto[];
  total: number;
  page: number;
  pageSize: number;
}

export type GastoListPagedParams = {
  page: number;
  pageSize: number;
} & GastoListFilters;

export interface GastoApi {
  listPaged: (params: GastoListPagedParams) => Promise<GastoListPagedResult>;
  getById: (id: number) => Promise<Gasto | null>;
  create: (data: GastoInput) => Promise<Gasto>;
  update: (id: number, data: GastoUpdateInput) => Promise<Gasto>;
  delete: (id: number) => Promise<Gasto>;
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

// ─── Estadísticas (inicio / KPI) ─────────────────────────────────────────

export interface HomeDashboardMom {
  actual: number;
  anterior: number;
  momPct: number | null;
}

export interface HomeDashboardSeriesPoint {
  monthKey: string;
  mesCorto: string;
  ingresos: number;
  gastos: number;
}

export interface HomeDashboardMetodoPago {
  metodoPago: string;
  total: number;
}

export interface HomeDashboardProductRank {
  productoId: number;
  nombre: string;
  sku: string;
  cantidad: number;
}

export interface ProductoCaducidadProxima {
  productoId: number;
  nombre: string;
  sku: string;
  stockActual: number;
  fechaCaducidad: string; // ISO format
}

/** Rango inclusive (AAAA-MM-DD, día local) para KPIs del inicio. */
export interface HomeDashboardRangeInput {
  desde: string;
  hasta: string;
}

export interface HomeDashboardStats {
  moneda: string;
  /** Etiqueta del periodo seleccionado (p. ej. rango de fechas). */
  mesActualLabel: string;
  /** Etiqueta del periodo de comparación (misma duración en días, inmediatamente anterior). */
  mesAnteriorLabel: string;
  ingresos: HomeDashboardMom;
  gastos: HomeDashboardMom;
  ventasCount: { actual: number; anterior: number };
  ticketPromedio: HomeDashboardMom;
  balanceActual: number;
  series6m: HomeDashboardSeriesPoint[];
  metodoPagoMes: HomeDashboardMetodoPago[];
  /** Top unidades vendidas en el periodo (ventas activas). */
  productosMasVendidos: HomeDashboardProductRank[];
  /** Menor rotación entre productos con ventas en el periodo. */
  productosMenosVendidos: HomeDashboardProductRank[];
  /** 10 productos con stock y fecha de caducidad más cercana (vivos, con stock > 0). */
  productosProximosCaducar: ProductoCaducidadProxima[];
}

export interface StatsApi {
  getHomeDashboard: (range?: HomeDashboardRangeInput | null) => Promise<HomeDashboardStats>;
}

/** Usuario autenticado (sesión en el proceso principal). */
export interface AuthUser {
  usuarioId: number;
  username: string;
  nombre: string;
  rolNombre: string;
}

export interface AuthApi {
  ensureAdmin: () => Promise<boolean>;
  login: (username: string, password: string) => Promise<AuthUser>;
  getCurrentUser: () => Promise<AuthUser | null>;
  logout: () => Promise<boolean>;
}

export interface ElectronApi {
  auth: AuthApi;
  producto: ProductoApi;
  proveedor: ProveedorApi;
  configuracion: ConfiguracionApi;
  file: FileApi;
  venta: VentaApi;
  gasto: GastoApi;
  stats: StatsApi;
  rol: RolApi;
  usuario: UsuarioApi;
}

declare global {
  interface Window {
    api: ElectronApi;
  }
}

export {};
