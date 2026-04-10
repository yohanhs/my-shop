import { app, BrowserWindow } from 'electron';
import path from 'path';
import { initializeDatabase, disconnectPrisma } from './db/client';
import { registerConfiguracionIpc } from './ipc/configuracion.ipc';
import { registerProductoIpc } from './ipc/producto.ipc';
import { registerRolIpc } from './ipc/rol.ipc';
import { registerProveedorIpc } from './ipc/proveedor.ipc';
import { registerUsuarioIpc } from './ipc/usuario.ipc';
import { registerGastoIpc } from './ipc/gasto.ipc';
import { registerVentaIpc } from './ipc/venta.ipc';

let mainWindow: BrowserWindow | null = null;

async function createWindow(): Promise<void> {
  await initializeDatabase();

  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  // En desarrollo carga el servidor de Vite, en producción el build
  const isDev = !app.isPackaged;
  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(async () => {
  registerProductoIpc();
  registerProveedorIpc();
  registerConfiguracionIpc();
  registerRolIpc();
  registerUsuarioIpc();
  registerVentaIpc();
  registerGastoIpc();
  await createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', async () => {
  await disconnectPrisma();
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
