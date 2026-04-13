import { app, BrowserWindow } from 'electron';
import path from 'path';

import { registerShopImgHandler, registerShopImgPrivileges } from './protocols/shopImgProtocol';

registerShopImgPrivileges();
import { initializeDatabase, disconnectPrisma } from './db/client';
import { registerConfiguracionIpc } from './ipc/configuracion.ipc';
import { registerProductoIpc } from './ipc/producto.ipc';
import { registerRolIpc } from './ipc/rol.ipc';
import { registerProveedorIpc } from './ipc/proveedor.ipc';
import { registerUsuarioIpc } from './ipc/usuario.ipc';
import { registerGastoIpc } from './ipc/gasto.ipc';
import { registerFileIpc } from './ipc/file.ipc';
import { registerStatsIpc } from './ipc/stats.ipc';
import { registerMermaIpc } from './ipc/merma.ipc';
import { registerDatabaseIpc } from './ipc/database.ipc';
import { registerVentaIpc } from './ipc/venta.ipc';
import { registerAuthIpc, seedDefaultAuth } from './ipc/auth.ipc';
import { getPrismaClient } from './db/client';

let mainWindow: BrowserWindow | null = null;

function preloadScriptPath(): string {
  return path.join(__dirname, '../preload/index.js');
}

async function createWindow(): Promise<void> {
  await initializeDatabase();
  await seedDefaultAuth(getPrismaClient());

  const webPreferences = {
    preload: preloadScriptPath(),
    contextIsolation: true,
    nodeIntegration: false,
  } as const;

  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    webPreferences: { ...webPreferences },
  });

  /** `window.open()` no hereda preload; sin esto `window.api` queda undefined en tickets / popups. */
  mainWindow.webContents.setWindowOpenHandler(() => ({
    action: 'allow',
    overrideBrowserWindowOptions: {
      width: 440,
      height: 820,
      autoHideMenuBar: true,
      webPreferences: { ...webPreferences },
    },
  }));

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
  registerShopImgHandler();
  registerAuthIpc();
  registerFileIpc();
  registerDatabaseIpc();
  registerProductoIpc();
  registerProveedorIpc();
  registerConfiguracionIpc();
  registerRolIpc();
  registerUsuarioIpc();
  registerVentaIpc();
  registerGastoIpc();
  registerStatsIpc();
  registerMermaIpc();
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
