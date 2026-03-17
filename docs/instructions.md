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
-usar como directorio para todo el code "src"
-separar por directorios el front del back.


## Estructura
/src
├── /main              <-- BACKEND (Node.js/Electron/Prisma)
│   ├── main.ts        <-- Punto de entrada
│   ├── /db            <-- Prisma Client y Esquema
│   ├── /services      <-- Lógica de negocio (ventas, stock, auth)
│   └── /ipc           <-- Handlers de comunicación con el Front
├── /preload           <-- EL PUENTE (Security bridge)
│   └── index.ts
└── /renderer          <-- FRONTEND (React/Vite)
    ├── /components    <-- UI (Tailwind)
    ├── /hooks         <-- Lógica de React
    ├── /store         <-- Zustand (Carrito, Usuario actual)
    └── /pages         <-- Vistas (Login, POS, Inventario)

## Front

    PROMPT

    "Actúa como un desarrollador experto en Electron y Prisma. Basado en el archivo #Contexto del Proyecto, por favor realiza las siguientes tareas:

Configuración de Prisma: Crea el archivo src/main/db/schema.prisma definiendo todas las tablas y relaciones (relación 1:N entre Ventas y VentaDetalle, Producto y Stock, etc.). Asegúrate de usar Enums para los estados y roles.

Backend (Main): Configura el proceso principal en src/main/main.ts para que inicialice el PrismaClient apuntando a un archivo local en app.getPath('userData').

Separación de Capas: Crea un ejemplo de comunicación IPC en src/main/ipc/ para la tabla Productos (CRUD básico) y su correspondiente exposición en src/preload/index.ts.

Frontend (Renderer): Configura la estructura básica de React en src/renderer y crea un useProductStore con Zustand que llame a las funciones del backend mediante el puente IPC.

Inicialización: Crea un script de 'seed' para insertar los Roles (Admin, Vendedor, Inventarista) y un usuario Admin por defecto con una contraseña inicial."