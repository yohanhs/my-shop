# Contexto del Proyecto: Gestor de Contabilidad (Tienda)

## Stack Tecnológico
- **Framework:** React + Electron
- **Base de Datos:** SQLite (Local)
- **Estilos:** Tailwind CSS
- **Estado:** Zustand
- **:ORM:** Prisma(instalar y configurar para que todo funcione)

## Reglas de Negocio (Críticas)
1. **Offline First:** Toda transacción debe guardarse en SQLite localmente. No se requiere login en la nube, local si.
3. **Seguridad:** Antes de borrar un registro contable, pedir confirmación.

## Estructura de Datos (Tablas Prisma)

- **Productos:** id, nombre, SKU (unique), precio_costo, precio_venta, stock_actual, stock_minimo, imagen_path (string), status (ACTIVE/INACTIVE).
- **Ventas:** id, fecha, total, metodo_pago, estado (ACTIVA/ANULADA), ticket_folio.
- **VentaDetalle:** id, ventaId, productoId, cantidad, precio_aplicado, precio_costo_unitario_historico.
- **Gastos:** id, concepto, monto, fecha, categoria.
- **MovimientosStock:** id, productoId, tipo (ENTRADA/SALIDA), cantidad, motivo (COMPRA/VENTA/AJUSTE), fecha, usuarioId, proveedorId (opcional/nullable).
- **Configuracion:** id, nombre_tienda, moneda, impuesto_porcentaje, logo_path.
- **Proveedores: ** id, nombre, teléfono, empresa, direccion, email.
- ** Usuario: id, nombre, username (único), password_hash, rolId, status (ACTIVE/INACTIVE).
- ** Rol: id, nombre (Admin, Vendedor, Inventarista).

## Preferencias de Código
- Usar Hooks funcionales en React.
- Separar la lógica de base de datos en una carpeta `/src/db`.


## Estructura
/src
├── /main              <-- BACKEND (Node.js/Electron/Prisma)
│   ├── main.ts        <-- Punto de entrada
│   ├── /db            <-- Prisma Client y Esquema
│   ├── /services      <-- Lógica de negocio (ventas, stock, auth)
│   └── /ipc           <-- Handlers de comunicación con el Front
├── /preload           <-- EL PUENTE (Security bridge)
│   └── index.ts
└── /app          <-- FRONTEND (React/Vite)
    ├── /components    <-- UI (Tailwind)
    ├── /hooks         <-- Lógica de React
    ├── /store         <-- Zustand (Usuario actual)
    └── /pages         <-- Vistas (Login,Products, Inventario,etc)
