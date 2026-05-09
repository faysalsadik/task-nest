const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');

let mainWindow;
let isPinned = true;

function getStoredValue(key, defaultValue) {
    try {
        const userDataPath = app.getPath('userData');
        const filePath = path.join(userDataPath, key);
        if (fs.existsSync(filePath)) {
            return JSON.parse(fs.readFileSync(filePath, 'utf8'));
        }
    } catch (e) {}
    return defaultValue;
}

function setStoredValue(key, value) {
    try {
        const userDataPath = app.getPath('userData');
        const filePath = path.join(userDataPath, key);
        fs.writeFileSync(filePath, JSON.stringify(value));
    } catch (e) {}
}

function createWindow() {
    console.log('Creating window...');

    const savedBounds = getStoredValue('taskyWindowBounds', null);
    const savedPinned = getStoredValue('taskyPinned', null);

    isPinned = savedPinned !== null ? savedPinned : true;

    const bounds = savedBounds || { width: 350, height: 500 };

mainWindow = new BrowserWindow({
        width: bounds.width,
        height: bounds.height,
        x: bounds.x,
        y: bounds.y,
        minWidth: 280,
        minHeight: 300,
        frame: false,
        transparent: false,
        alwaysOnTop: isPinned,
        resizable: true,
        backgroundColor: '#0a0a0a',
        hasShadow: false,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: path.join(__dirname, 'preload.js')
        },
        icon: 'icon.png',
        title: 'Tasky',
        show: false
    });

    mainWindow.loadFile('index.html').then(() => {
        console.log('HTML loaded successfully');
    }).catch((err) => {
        console.log('HTML load error:', err);
    });

    mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
        console.log('Failed to load:', errorCode, errorDescription);
    });

    mainWindow.webContents.on('crashed', () => {
        console.log('WebContents crashed');
    });

    mainWindow.once('ready-to-show', () => {
        console.log('Window ready to show');
        mainWindow.show();
    });

    mainWindow.on('close', (e) => {
        console.log('Window close event');
        const bounds = mainWindow.getBounds();
        setStoredValue('taskyWindowBounds', bounds);
    });

    mainWindow.on('moved', () => {
        const bounds = mainWindow.getBounds();
        setStoredValue('taskyWindowBounds', bounds);
    });

    mainWindow.on('resized', () => {
        const bounds = mainWindow.getBounds();
        setStoredValue('taskyWindowBounds', bounds);
    });

    mainWindow.on('closed', () => {
        console.log('Window closed');
        mainWindow = null;
    });
}

ipcMain.handle('toggle-pin', () => {
    isPinned = !isPinned;
    mainWindow.setAlwaysOnTop(isPinned);
    setStoredValue('taskyPinned', isPinned);
    mainWindow.webContents.send('pin-changed', isPinned);
    return isPinned;
});

ipcMain.handle('minimize-window', () => {
    if (mainWindow) mainWindow.minimize();
});

ipcMain.handle('close-window', () => {
    if (mainWindow) mainWindow.close();
});

ipcMain.handle('get-pin-state', () => {
    return isPinned;
});

ipcMain.handle('get-auto-start', () => {
    const loginItemSettings = app.getLoginItemSettings();
    return loginItemSettings.openAtLogin;
});

ipcMain.handle('set-auto-start', (event, enable) => {
    app.setLoginItemSettings({
        openAtLogin: enable,
        path: process.execPath
    });
    return enable;
});

app.whenReady().then(() => {
    console.log('App ready');
    createWindow();
});

app.on('window-all-closed', () => {
    console.log('All windows closed');
    app.quit();
});

app.on('activate', () => {
    console.log('Activate event');
    if (!mainWindow) {
        createWindow();
    }
});