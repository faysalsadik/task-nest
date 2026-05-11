const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const initSqlJs = require('sql.js');

let db;
let dbPath;

async function initDatabase() {
    const userDataPath = app.getPath('userData');
    dbPath = path.join(userDataPath, 'tasky.db');

    const SQL = await initSqlJs();

    if (fs.existsSync(dbPath)) {
        const buffer = fs.readFileSync(dbPath);
        db = new SQL.Database(buffer);
    } else {
        db = new SQL.Database();
    }

    db.run('PRAGMA foreign_keys = ON');

    db.run(`CREATE TABLE IF NOT EXISTS tasks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        details TEXT DEFAULT '',
        deadline TEXT DEFAULT '',
        completed INTEGER DEFAULT 0,
        position INTEGER DEFAULT 0
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS subtasks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        task_id INTEGER NOT NULL,
        title TEXT NOT NULL,
        details TEXT DEFAULT '',
        deadline TEXT DEFAULT '',
        completed INTEGER DEFAULT 0,
        position INTEGER DEFAULT 0,
        FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS tags (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        task_id INTEGER,
        subtask_id INTEGER,
        name TEXT NOT NULL,
        FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
        FOREIGN KEY (subtask_id) REFERENCES subtasks(id) ON DELETE CASCADE
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS projects (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        details TEXT DEFAULT '',
        goals TEXT DEFAULT '',
        time_frame TEXT DEFAULT '',
        road_map TEXT DEFAULT '',
        created_at TEXT DEFAULT (datetime('now'))
    )`);

    saveDatabase();
}

function saveDatabase() {
    const data = db.export();
    fs.writeFileSync(dbPath, Buffer.from(data));
}

function dbRun(sql, params = []) {
    db.run(sql, params);
    saveDatabase();
}

function dbAll(sql, params = []) {
    const stmt = db.prepare(sql);
    if (params.length > 0) stmt.bind(params);
    const rows = [];
    while (stmt.step()) {
        rows.push(stmt.getAsObject());
    }
    stmt.free();
    return rows;
}

function dbGet(sql, params = []) {
    const rows = dbAll(sql, params);
    return rows.length > 0 ? rows[0] : null;
}

function getLastInsertId() {
    const row = dbGet('SELECT last_insert_rowid() as id');
    return row ? row.id : null;
}

function getAllTasksData() {
    const tasks = dbAll('SELECT * FROM tasks ORDER BY position, id DESC');

    for (const task of tasks) {
        task.completed = !!task.completed;
        task.subtasks = dbAll('SELECT * FROM subtasks WHERE task_id = ? ORDER BY position, id', [task.id]);
        task.tags = dbAll('SELECT name FROM tags WHERE task_id = ?', [task.id]).map(t => t.name);
        task.expanded = false;

        for (const st of task.subtasks) {
            st.completed = !!st.completed;
            st.tags = dbAll('SELECT name FROM tags WHERE subtask_id = ?', [st.id]).map(t => t.name);
            st.expanded = false;
        }
    }

    return { tasks };
}

function getTaskWithRelations(taskId) {
    const task = dbGet('SELECT * FROM tasks WHERE id = ?', [taskId]);
    if (!task) return null;
    task.completed = !!task.completed;
    task.subtasks = dbAll('SELECT * FROM subtasks WHERE task_id = ? ORDER BY position, id', [task.id]);
    task.tags = dbAll('SELECT name FROM tags WHERE task_id = ?', [task.id]).map(t => t.name);
    task.expanded = false;
    for (const st of task.subtasks) {
        st.completed = !!st.completed;
        st.tags = dbAll('SELECT name FROM tags WHERE subtask_id = ?', [st.id]).map(t => t.name);
        st.expanded = false;
    }
    return task;
}

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
        backgroundColor: '#000000',
        hasShadow: false,
        thickFrame: false,
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

ipcMain.handle('db:get-all-tasks', () => {
    return getAllTasksData();
});

ipcMain.handle('db:create-task', (event, { title, details, deadline }) => {
    dbRun('INSERT INTO tasks (title, details, deadline) VALUES (?, ?, ?)', [title, details || '', deadline || '']);
    const id = getLastInsertId();
    return getTaskWithRelations(id);
});

ipcMain.handle('db:update-task', (event, { id, title, details, deadline, completed }) => {
    const updates = [];
    const values = [];
    if (title !== undefined) { updates.push('title = ?'); values.push(title); }
    if (details !== undefined) { updates.push('details = ?'); values.push(details); }
    if (deadline !== undefined) { updates.push('deadline = ?'); values.push(deadline); }
    if (completed !== undefined) { updates.push('completed = ?'); values.push(completed ? 1 : 0); }
    if (updates.length > 0) {
        values.push(id);
        dbRun(`UPDATE tasks SET ${updates.join(', ')} WHERE id = ?`, values);
    }
    return getTaskWithRelations(id);
});

ipcMain.handle('db:delete-task', (event, id) => {
    dbRun('DELETE FROM subtasks WHERE task_id = ?', [id]);
    dbRun('DELETE FROM tags WHERE task_id = ?', [id]);
    dbRun('DELETE FROM tasks WHERE id = ?', [id]);
    return { success: true };
});

ipcMain.handle('db:create-subtask', (event, { taskId, title, details, deadline }) => {
    dbRun('INSERT INTO subtasks (task_id, title, details, deadline) VALUES (?, ?, ?, ?)', [taskId, title, details || '', deadline || '']);
    const id = getLastInsertId();
    return dbGet('SELECT * FROM subtasks WHERE id = ?', [id]);
});

ipcMain.handle('db:update-subtask', (event, { id, title, details, deadline, completed }) => {
    const updates = [];
    const values = [];
    if (title !== undefined) { updates.push('title = ?'); values.push(title); }
    if (details !== undefined) { updates.push('details = ?'); values.push(details); }
    if (deadline !== undefined) { updates.push('deadline = ?'); values.push(deadline); }
    if (completed !== undefined) { updates.push('completed = ?'); values.push(completed ? 1 : 0); }
    if (updates.length > 0) {
        values.push(id);
        dbRun(`UPDATE subtasks SET ${updates.join(', ')} WHERE id = ?`, values);
    }
    return dbGet('SELECT * FROM subtasks WHERE id = ?', [id]);
});

ipcMain.handle('db:delete-subtask', (event, id) => {
    dbRun('DELETE FROM tags WHERE subtask_id = ?', [id]);
    dbRun('DELETE FROM subtasks WHERE id = ?', [id]);
    return { success: true };
});

ipcMain.handle('db:add-tag', (event, { taskId, subtaskId, name }) => {
    if (subtaskId !== undefined && subtaskId !== null) {
        const existing = dbGet('SELECT id FROM tags WHERE subtask_id = ? AND name = ?', [subtaskId, name]);
        if (!existing) {
            dbRun('INSERT INTO tags (subtask_id, name) VALUES (?, ?)', [subtaskId, name]);
        }
    } else if (taskId !== undefined && taskId !== null) {
        const existing = dbGet('SELECT id FROM tags WHERE task_id = ? AND name = ?', [taskId, name]);
        if (!existing) {
            dbRun('INSERT INTO tags (task_id, name) VALUES (?, ?)', [taskId, name]);
        }
    }
    return { success: true };
});

ipcMain.handle('db:remove-tag', (event, { taskId, subtaskId, name }) => {
    if (subtaskId !== undefined && subtaskId !== null) {
        dbRun('DELETE FROM tags WHERE subtask_id = ? AND name = ?', [subtaskId, name]);
    } else if (taskId !== undefined && taskId !== null) {
        dbRun('DELETE FROM tags WHERE task_id = ? AND name = ?', [taskId, name]);
    }
    return { success: true };
});

ipcMain.handle('db:get-all-projects', () => {
    return dbAll('SELECT * FROM projects ORDER BY id DESC');
});

ipcMain.handle('db:create-project', (event, { name, details, goals, time_frame, road_map }) => {
    dbRun('INSERT INTO projects (name, details, goals, time_frame, road_map) VALUES (?, ?, ?, ?, ?)',
        [name, details || '', goals || '', time_frame || '', road_map || '']);
    const id = getLastInsertId();
    return dbGet('SELECT * FROM projects WHERE id = ?', [id]);
});

ipcMain.handle('db:update-project', (event, { id, name, details, goals, time_frame, road_map }) => {
    const updates = [];
    const values = [];
    if (name !== undefined) { updates.push('name = ?'); values.push(name); }
    if (details !== undefined) { updates.push('details = ?'); values.push(details); }
    if (goals !== undefined) { updates.push('goals = ?'); values.push(goals); }
    if (time_frame !== undefined) { updates.push('time_frame = ?'); values.push(time_frame); }
    if (road_map !== undefined) { updates.push('road_map = ?'); values.push(road_map); }
    if (updates.length > 0) {
        values.push(id);
        dbRun(`UPDATE projects SET ${updates.join(', ')} WHERE id = ?`, values);
    }
    return dbGet('SELECT * FROM projects WHERE id = ?', [id]);
});

ipcMain.handle('db:delete-project', (event, id) => {
    dbRun('DELETE FROM projects WHERE id = ?', [id]);
    return { success: true };
});

app.whenReady().then(async () => {
    console.log('App ready');
    await initDatabase();
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