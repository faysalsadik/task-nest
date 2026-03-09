const { app, BrowserWindow, ipcMain, Tray, Menu, nativeImage, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const log = require('electron-log');

log.transports.file.level = 'info';
log.transports.console.level = 'debug';
log.info('Application starting...');

let mainWindow = null;
let tray = null;

const userDataPath = app.getPath('userData');
const dataPath = path.join(userDataPath, 'data');
const backupsPath = path.join(userDataPath, 'backups');

if (!fs.existsSync(dataPath)) {
  fs.mkdirSync(dataPath, { recursive: true });
}
if (!fs.existsSync(backupsPath)) {
  fs.mkdirSync(backupsPath, { recursive: true });
}

function loadData(filename) {
  const filePath = path.join(dataPath, filename);
  try {
    if (fs.existsSync(filePath)) {
      const data = fs.readFileSync(filePath, 'utf-8');
      return JSON.parse(data);
    }
  } catch (error) {
    log.error(`Error loading ${filename}:`, error);
  }
  return null;
}

function saveData(filename, data) {
  const filePath = path.join(dataPath, filename);
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
    log.info(`Saved ${filename}`);
    return true;
  } catch (error) {
    log.error(`Error saving ${filename}:`, error);
    return false;
  }
}

function createWindow() {
  log.info('Creating main window...');
  
  const preloadPath = path.join(__dirname, 'preload.js');
  log.info('Preload path:', preloadPath);
  
  const primaryDisplay = require('electron').screen.getPrimaryDisplay();
  const { width: screenWidth } = primaryDisplay.workAreaSize;
  const quarterWidth = Math.floor(screenWidth / 4);
  
  mainWindow = new BrowserWindow({
    width: quarterWidth,
    height: 800,
    minWidth: 280,
    minHeight: 500,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: preloadPath
    },
    show: false,
    backgroundColor: '#f5f6f8'
  });

  const isDev = process.env.NODE_ENV === 'development';
  
  if (isDev) {
    mainWindow.loadURL('http://localhost:3000');
    mainWindow.webContents.openDevTools();
  } else {
    const indexPath = path.join(__dirname, '../dist/renderer/index.html');
    log.info('Loading index from:', indexPath);
    mainWindow.loadFile(indexPath).catch(err => {
      log.error('Failed to load file:', err);
    });
  }

  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
    log.error('Failed to load:', errorCode, errorDescription);
  });

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    log.info('Main window displayed');
  });

  mainWindow.on('close', (event) => {
    if (!app.isQuitting) {
      event.preventDefault();
      mainWindow.hide();
      log.info('Window hidden to tray');
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function createTray() {
  const iconPath = path.join(__dirname, '../assets/icon.png');
  let trayIcon;
  
  if (fs.existsSync(iconPath)) {
    trayIcon = nativeImage.createFromPath(iconPath);
  } else {
    trayIcon = nativeImage.createEmpty();
  }
  
  tray = new Tray(trayIcon.resize({ width: 16, height: 16 }));
  
  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Show Todo',
      click: () => {
        if (mainWindow) {
          mainWindow.show();
          mainWindow.focus();
        }
      }
    },
    {
      label: 'Add Task',
      click: () => {
        if (mainWindow) {
          mainWindow.show();
          mainWindow.webContents.send('add-task-from-tray');
        }
      }
    },
    { type: 'separator' },
    {
      label: 'Quit',
      click: () => {
        app.isQuitting = true;
        app.quit();
      }
    }
  ]);

  tray.setToolTip('TaskNest');
  tray.setContextMenu(contextMenu);
  
  tray.on('double-click', () => {
    if (mainWindow) {
      mainWindow.show();
      mainWindow.focus();
    }
  });
  
  log.info('System tray created');
}

ipcMain.handle('load-tasks', () => {
  return loadData('tasks.json') || [];
});

ipcMain.handle('save-tasks', (event, tasks) => {
  return saveData('tasks.json', tasks);
});

ipcMain.handle('load-categories', () => {
  return loadData('categories.json') || [];
});

ipcMain.handle('save-categories', (event, categories) => {
  return saveData('categories.json', categories);
});

ipcMain.handle('load-settings', () => {
  return loadData('settings.json') || {
    theme: 'light',
    defaultView: 'all',
    sortBy: 'createdAt',
    sortOrder: 'desc',
    startMinimized: false,
    confirmDelete: true,
    autoBackup: true,
    backupInterval: 24,
    notifications: {
      enabled: true,
      reminderTime: 30,
      sound: true
    }
  };
});

ipcMain.handle('save-settings', (event, settings) => {
  return saveData('settings.json', settings);
});

ipcMain.handle('load-columns', () => {
  return loadData('columns.json');
});

ipcMain.handle('save-columns', (event, columns) => {
  return saveData('columns.json', columns);
});

ipcMain.handle('export-data', async (event, data) => {
  const { filePath } = await dialog.showSaveDialog(mainWindow, {
    defaultPath: 'todo-export.json',
    filters: [{ name: 'JSON', extensions: ['json'] }]
  });
  
  if (filePath) {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
    return true;
  }
  return false;
});

ipcMain.handle('import-data', async () => {
  const { filePaths } = await dialog.showOpenDialog(mainWindow, {
    filters: [{ name: 'JSON', extensions: ['json'] }],
    properties: ['openFile']
  });
  
  if (filePaths && filePaths.length > 0) {
    try {
      const data = fs.readFileSync(filePaths[0], 'utf-8');
      return JSON.parse(data);
    } catch (error) {
      log.error('Import error:', error);
      return null;
    }
  }
  return null;
});

process.on('uncaughtException', (error) => {
  log.error('Uncaught Exception:', error);
  dialog.showErrorBox('Error', `An unexpected error occurred: ${error.message}`);
});

process.on('unhandledRejection', (reason) => {
  log.error('Unhandled Rejection:', reason);
});

app.whenReady().then(() => {
  log.info('App ready, creating window and tray...');
  createWindow();
  createTray();
  
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    } else if (mainWindow) {
      mainWindow.show();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    // Don't quit, stay in tray
  }
});

app.on('before-quit', () => {
  app.isQuitting = true;
});
