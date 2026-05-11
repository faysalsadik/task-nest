const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    togglePin: () => ipcRenderer.invoke('toggle-pin'),
    minimize: () => ipcRenderer.invoke('minimize-window'),
    close: () => ipcRenderer.invoke('close-window'),
    getPinState: () => ipcRenderer.invoke('get-pin-state'),
    getAutoStart: () => ipcRenderer.invoke('get-auto-start'),
    setAutoStart: (enable) => ipcRenderer.invoke('set-auto-start', enable),
    onPinChanged: (callback) => {
        ipcRenderer.on('pin-changed', (_, isPinned) => callback(isPinned));
    },

    getAllTasks: () => ipcRenderer.invoke('db:get-all-tasks'),
    createTask: (data) => ipcRenderer.invoke('db:create-task', data),
    updateTask: (data) => ipcRenderer.invoke('db:update-task', data),
    deleteTask: (id) => ipcRenderer.invoke('db:delete-task', id),
    createSubtask: (data) => ipcRenderer.invoke('db:create-subtask', data),
    updateSubtask: (data) => ipcRenderer.invoke('db:update-subtask', data),
    deleteSubtask: (id) => ipcRenderer.invoke('db:delete-subtask', id),
    addTag: (data) => ipcRenderer.invoke('db:add-tag', data),
    removeTag: (data) => ipcRenderer.invoke('db:remove-tag', data),

    getAllProjects: () => ipcRenderer.invoke('db:get-all-projects'),
    createProject: (data) => ipcRenderer.invoke('db:create-project', data),
    updateProject: (data) => ipcRenderer.invoke('db:update-project', data),
    deleteProject: (id) => ipcRenderer.invoke('db:delete-project', id),

    getAllNotes: () => ipcRenderer.invoke('db:get-all-notes'),
    createNote: (data) => ipcRenderer.invoke('db:create-note', data),
    updateNote: (data) => ipcRenderer.invoke('db:update-note', data),
    deleteNote: (id) => ipcRenderer.invoke('db:delete-note', id),

    reorderTasks: (ids) => ipcRenderer.invoke('db:reorder-tasks', ids),
    reorderProjects: (ids) => ipcRenderer.invoke('db:reorder-projects', ids),
    reorderNotes: (ids) => ipcRenderer.invoke('db:reorder-notes', ids),
});