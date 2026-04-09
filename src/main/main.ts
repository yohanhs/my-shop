import { app, BrowserWindow } from 'electron';
import path from 'path';
import { initializeDatabase, disconnectPrisma } from './db/client';
import { registerProductoIpc } from './ipc/producto.ipc';
import { registerRolIpc } from './ipc/rol.ipc';
import { registerUsuarioIpc } from './ipc/usuario.ipc';

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
  registerRolIpc();
  registerUsuarioIpc();
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
