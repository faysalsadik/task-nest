import React, { useState, useEffect, useCallback, useRef } from 'react';
import Sidebar from './components/Sidebar';
import Board from './components/Board';
import Header from './components/Header';
import './styles/global.css';

function App() {
  const [tasks, setTasks] = useState([]);
  const [categories, setCategories] = useState([]);
  const [settings, setSettings] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterPriority, setFilterPriority] = useState('all');
  const [showSettings, setShowSettings] = useState(false);
  const [columns, setColumns] = useState([
    { id: 'todo', title: 'To Do', order: 0 },
    { id: 'inprogress', title: 'In Progress', order: 1 },
    { id: 'done', title: 'Done', order: 2 }
  ]);
  const [draggedColumn, setDraggedColumn] = useState(null);
  const [draggedTask, setDraggedTask] = useState(null);
  const saveTimeoutRef = useRef(null);

  const { v4: uuidv4 } = { v4: () => Math.random().toString(36).substr(2, 9) + Date.now().toString(36) };

  useEffect(() => {
    const loadData = async () => {
      try {
        const loadedTasks = await window.electronAPI.loadTasks();
        const loadedCategories = await window.electronAPI.loadCategories();
        const loadedSettings = await window.electronAPI.loadSettings();
        const loadedColumns = await window.electronAPI.loadColumns();
        
        setTasks(loadedTasks || []);
        setCategories(loadedCategories || []);
        setSettings(loadedSettings);
        if (loadedColumns && loadedColumns.length > 0) {
          setColumns(loadedColumns);
        }
      } catch (error) {
        console.error('Error loading data:', error);
      }
    };
    
    loadData();
    
    window.electronAPI.onAddTaskFromTray(() => {
    });
  }, []);

  const saveTasks = useCallback(async (newTasks) => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    saveTimeoutRef.current = setTimeout(async () => {
      await window.electronAPI.saveTasks(newTasks);
    }, 500);
  }, []);

  const saveCategories = useCallback(async (newCategories) => {
    await window.electronAPI.saveCategories(newCategories);
  }, []);

  const saveSettings = useCallback(async (newSettings) => {
    await window.electronAPI.saveSettings(newSettings);
    setSettings(newSettings);
  }, []);

  const saveColumns = useCallback(async (newColumns) => {
    await window.electronAPI.saveColumns(newColumns);
  }, []);

  const addTask = useCallback((title, status = 'todo') => {
    const columnTasks = tasks.filter(t => t.status === status && !t.parentId);
    const newTask = {
      id: uuidv4(),
      title,
      description: '',
      status,
      priority: 'none',
      dueDate: null,
      categoryId: selectedCategory !== 'all' ? selectedCategory : null,
      parentId: null,
      order: columnTasks.length,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      completedAt: null,
      metadata: {}
    };
    
    const newTasks = [...tasks, newTask];
    setTasks(newTasks);
    saveTasks(newTasks);
    
    return newTask;
  }, [tasks, selectedCategory, saveTasks]);

  const updateTask = useCallback((taskId, updates) => {
    const newTasks = tasks.map(task => {
      if (task.id === taskId) {
        return { ...task, ...updates, updatedAt: new Date().toISOString() };
      }
      return task;
    });
    setTasks(newTasks);
    saveTasks(newTasks);
  }, [tasks, saveTasks]);

  const deleteTask = useCallback((taskId) => {
    const deleteRecursive = (id) => {
      const children = tasks.filter(t => t.parentId === id);
      let idsToDelete = [id];
      children.forEach(child => {
        idsToDelete = [...idsToDelete, ...deleteRecursive(child.id)];
      });
      return idsToDelete;
    };
    
    const idsToDelete = deleteRecursive(taskId);
    const newTasks = tasks.filter(t => !idsToDelete.includes(t.id));
    setTasks(newTasks);
    saveTasks(newTasks);
  }, [tasks, saveTasks]);

  const toggleComplete = useCallback((taskId) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;
    
    const newStatus = task.status === 'done' ? 'todo' : 'done';
    const updates = {
      status: newStatus,
      completedAt: newStatus === 'done' ? new Date().toISOString() : null
    };
    
    const newTasks = tasks.map(t => {
      if (t.id === taskId) {
        return { ...t, ...updates, updatedAt: new Date().toISOString() };
      }
      return t;
    });
    setTasks(newTasks);
    saveTasks(newTasks);
  }, [tasks, saveTasks]);

  const moveTask = useCallback((taskId, newStatus, newOrder) => {
    let newTasks = tasks.map(t => {
      if (t.id === taskId) {
        return { 
          ...t, 
          status: newStatus, 
          order: newOrder,
          updatedAt: new Date().toISOString() 
        };
      }
      return t;
    });
    
    const tasksInColumn = newTasks.filter(t => t.status === newStatus && t.id !== taskId);
    tasksInColumn.forEach((task, index) => {
      if (index >= newOrder) {
        task.order = index + 1;
      }
    });
    
    setTasks(newTasks);
    saveTasks(newTasks);
  }, [tasks, saveTasks]);

  const getFilteredTasks = useCallback((status) => {
    let filtered = tasks.filter(t => t.status === status && !t.parentId);
    
    if (filterPriority !== 'all') {
      filtered = filtered.filter(t => t.priority === filterPriority);
    }
    
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(t => 
        t.title.toLowerCase().includes(query) || 
        (t.description && t.description.toLowerCase().includes(query))
      );
    }
    
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(t => t.categoryId === selectedCategory);
    }
    
    return filtered.sort((a, b) => a.order - b.order);
  }, [tasks, selectedCategory, filterPriority, searchQuery]);

  const addCategory = useCallback((name, color) => {
    const newCategory = {
      id: uuidv4(),
      name,
      color,
      order: categories.length,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    const newCategories = [...categories, newCategory];
    setCategories(newCategories);
    saveCategories(newCategories);
    return newCategory;
  }, [categories, saveCategories]);

  const deleteCategory = useCallback((categoryId) => {
    const newCategories = categories.filter(c => c.id !== categoryId);
    setCategories(newCategories);
    saveCategories(newCategories);
    
    const newTasks = tasks.map(task => {
      if (task.categoryId === categoryId) {
        return { ...task, categoryId: null };
      }
      return task;
    });
    setTasks(newTasks);
    saveTasks(newTasks);
    
    if (selectedCategory === categoryId) {
      setSelectedCategory('all');
    }
  }, [categories, tasks, selectedCategory, saveCategories, saveTasks]);

  const addColumn = useCallback((title) => {
    const newColumn = {
      id: uuidv4(),
      title,
      order: columns.length
    };
    const newColumns = [...columns, newColumn];
    setColumns(newColumns);
    saveColumns(newColumns);
  }, [columns, saveColumns]);

  const deleteColumn = useCallback((columnId) => {
    const newTasks = tasks.filter(t => t.status !== columnId);
    setTasks(newTasks);
    saveTasks(newTasks);
    
    const newColumns = columns.filter(col => col.id !== columnId);
    setColumns(newColumns);
    saveColumns(newColumns);
  }, [tasks, columns, saveTasks, saveColumns]);

  const handleColumnDragStart = (e, column) => {
    setDraggedColumn(column);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleColumnDragOver = (e) => {
    e.preventDefault();
  };

  const handleColumnDrop = (e, targetColumn) => {
    e.preventDefault();
    if (!draggedColumn || draggedColumn.id === targetColumn.id) return;

    const draggedIndex = columns.findIndex(c => c.id === draggedColumn.id);
    const targetIndex = columns.findIndex(c => c.id === targetColumn.id);
    
    const newColumns = [...columns];
    newColumns.splice(draggedIndex, 1);
    newColumns.splice(targetIndex, 0, draggedColumn);
    
    newColumns.forEach((col, index) => {
      col.order = index;
    });
    
    setColumns(newColumns);
    saveColumns(newColumns);
    setDraggedColumn(null);
  };

  const handleTaskDragStart = (e, task, columnId) => {
    setDraggedTask({ task, columnId });
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleTaskDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleTaskDrop = (e, targetColumnId) => {
    e.preventDefault();
    if (!draggedTask) return;
    
    const { task, columnId: sourceColumnId } = draggedTask;
    const columnTasks = tasks.filter(t => t.status === targetColumnId && t.id !== task.id);
    const newOrder = columnTasks.length;
    
    moveTask(task.id, targetColumnId, newOrder);
    setDraggedTask(null);
  };

  const theme = settings?.theme || 'light';

  return (
    <div className={`app ${theme}`}>
      <Header 
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onSettingsClick={() => setShowSettings(true)}
        settings={settings}
      />
      
      <div className="app-content">
        <Sidebar 
          categories={categories}
          selectedCategory={selectedCategory}
          onSelectCategory={setSelectedCategory}
          onAddCategory={addCategory}
          onDeleteCategory={deleteCategory}
          filterPriority={filterPriority}
          onFilterPriorityChange={setFilterPriority}
          totalTasks={tasks.length}
          columns={columns}
          onAddColumn={addColumn}
          onDeleteColumn={deleteColumn}
        />
        
        <Board 
          columns={columns}
          tasks={tasks}
          getFilteredTasks={getFilteredTasks}
          onAddTask={addTask}
          onUpdateTask={updateTask}
          onDeleteTask={deleteTask}
          onToggleComplete={toggleComplete}
          onMoveTask={moveTask}
          handleColumnDragStart={handleColumnDragStart}
          handleColumnDragOver={handleColumnDragOver}
          handleColumnDrop={handleColumnDrop}
          draggedColumn={draggedColumn}
          handleTaskDragStart={handleTaskDragStart}
          handleTaskDragOver={handleTaskDragOver}
          handleTaskDrop={handleTaskDrop}
          draggedTask={draggedTask}
        />
      </div>
      
      {showSettings && settings && (
        <div className="modal-overlay" onClick={() => setShowSettings(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h2>Settings</h2>
            
            <div className="settings-section">
              <h3>Appearance</h3>
              <label>
                Theme:
                <select 
                  value={settings.theme} 
                  onChange={(e) => saveSettings({...settings, theme: e.target.value})}
                >
                  <option value="light">Light</option>
                  <option value="dark">Dark</option>
                </select>
              </label>
            </div>
            
            <div className="settings-section">
              <h3>Behavior</h3>
              <label>
                <input 
                  type="checkbox" 
                  checked={settings.confirmDelete}
                  onChange={(e) => saveSettings({...settings, confirmDelete: e.target.checked})}
                />
                Confirm before delete
              </label>
            </div>
            
            <div className="settings-section">
              <h3>Data</h3>
              <button onClick={async () => {
                const data = { tasks, categories, settings, columns };
                await window.electronAPI.exportData(data);
              }}>
                Export Data
              </button>
              <button onClick={async () => {
                const data = await window.electronAPI.importData();
                if (data) {
                  if (data.tasks) setTasks(data.tasks);
                  if (data.categories) setCategories(data.categories);
                  if (data.settings) setSettings(data.settings);
                  if (data.columns) setColumns(data.columns);
                }
              }}>
                Import Data
              </button>
            </div>
            
            <button className="close-btn" onClick={() => setShowSettings(false)}>
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
