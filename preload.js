const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    togglePin: () => ipcRenderer.invoke('toggle-pin'),
    minimize: () => ipcRenderer.invoke('minimize-window'),
    close: () => ipcRenderer.invoke('close-window'),
    getPinState: () => ipcRenderer.invoke('get-pin-state'),
    onPinChanged: (callback) => {
        ipcRenderer.on('pin-changed', (_, isPinned) => callback(isPinned));
    }
});