const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  loadTasks: () => ipcRenderer.invoke('load-tasks'),
  saveTasks: (tasks) => ipcRenderer.invoke('save-tasks', tasks),
  loadCategories: () => ipcRenderer.invoke('load-categories'),
  saveCategories: (categories) => ipcRenderer.invoke('save-categories', categories),
  loadSettings: () => ipcRenderer.invoke('load-settings'),
  saveSettings: (settings) => ipcRenderer.invoke('save-settings', settings),
  loadColumns: () => ipcRenderer.invoke('load-columns'),
  saveColumns: (columns) => ipcRenderer.invoke('save-columns', columns),
  exportData: (data) => ipcRenderer.invoke('export-data', data),
  importData: () => ipcRenderer.invoke('import-data'),
  onAddTaskFromTray: (callback) => ipcRenderer.on('add-task-from-tray', callback)
});
