import React, { useState, useEffect, useCallback, useRef } from 'react';
import Sidebar from './components/Sidebar';
import TaskList from './components/TaskList';
import TaskDetails from './components/TaskDetails';
import Header from './components/Header';
import './styles/global.css';

const { v4: uuidv4 } = window.uuid ? window.uuid : { v4: () => Math.random().toString(36).substr(2, 9) };

function App() {
  const [tasks, setTasks] = useState([]);
  const [categories, setCategories] = useState([]);
  const [settings, setSettings] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedTask, setSelectedTask] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterPriority, setFilterPriority] = useState('all');
  const [showSettings, setShowSettings] = useState(false);
  const saveTimeoutRef = useRef(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        const loadedTasks = await window.electronAPI.loadTasks();
        const loadedCategories = await window.electronAPI.loadCategories();
        const loadedSettings = await window.electronAPI.loadSettings();
        
        setTasks(loadedTasks || []);
        setCategories(loadedCategories || []);
        setSettings(loadedSettings);
      } catch (error) {
        console.error('Error loading data:', error);
      }
    };
    
    loadData();
    
    window.electronAPI.onAddTaskFromTray(() => {
      setSelectedTask(null);
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

  const addTask = useCallback((title, parentId = null) => {
    const newTask = {
      id: uuidv4(),
      title,
      description: '',
      status: 'active',
      priority: 'none',
      dueDate: null,
      categoryId: selectedCategory !== 'all' ? selectedCategory : null,
      parentId,
      order: tasks.filter(t => t.parentId === parentId).length,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      completedAt: null,
      metadata: {}
    };
    
    const newTasks = [...tasks, newTask];
    setTasks(newTasks);
    saveTasks(newTasks);
    
    if (!parentId) {
      setSelectedTask(newTask);
    }
    
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
    
    if (selectedTask && selectedTask.id === taskId) {
      setSelectedTask(prev => ({ ...prev, ...updates }));
    }
  }, [tasks, selectedTask, saveTasks]);

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
    
    if (selectedTask && idsToDelete.includes(selectedTask.id)) {
      setSelectedTask(null);
    }
  }, [tasks, selectedTask, saveTasks]);

  const toggleComplete = useCallback((taskId) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;
    
    const newStatus = task.status === 'completed' ? 'active' : 'completed';
    const updates = {
      status: newStatus,
      completedAt: newStatus === 'completed' ? new Date().toISOString() : null
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

  const addSubtask = useCallback((parentId, title) => {
    return addTask(title, parentId);
  }, [addTask]);

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

  const moveTask = useCallback((taskId, newParentId, newOrder) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;
    
    let newTasks = tasks.map(t => {
      if (t.id === taskId) {
        return { 
          ...t, 
          parentId: newParentId, 
          order: newOrder,
          updatedAt: new Date().toISOString() 
        };
      }
      return t;
    });
    
    const siblings = newTasks.filter(t => t.parentId === newParentId && t.id !== taskId);
    siblings.forEach((sibling, index) => {
      if (index >= newOrder) {
        sibling.order = index + 1;
      }
    });
    
    setTasks(newTasks);
    saveTasks(newTasks);
  }, [tasks, saveTasks]);

  const getFilteredTasks = useCallback(() => {
    let filtered = [...tasks];
    
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(t => t.categoryId === selectedCategory);
    }
    
    if (filterStatus !== 'all') {
      filtered = filtered.filter(t => t.status === filterStatus);
    }
    
    if (filterPriority !== 'all') {
      filtered = filtered.filter(t => t.priority === filterPriority);
    }
    
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const searchInTask = (task) => {
        if (task.title.toLowerCase().includes(query)) return true;
        if (task.description && task.description.toLowerCase().includes(query)) return true;
        const children = tasks.filter(t => t.parentId === task.id);
        return children.some(searchInTask);
      };
      filtered = filtered.filter(searchInTask);
    }
    
    return filtered.filter(t => !t.parentId);
  }, [tasks, selectedCategory, filterStatus, filterPriority, searchQuery]);

  const getTaskProgress = useCallback((taskId) => {
    const subtasks = tasks.filter(t => t.parentId === taskId);
    if (subtasks.length === 0) return null;
    
    const completed = subtasks.filter(t => t.status === 'completed').length;
    return { completed, total: subtasks.length };
  }, [tasks]);

  const getSubtasks = useCallback((parentId) => {
    return tasks.filter(t => t.parentId === parentId).sort((a, b) => a.order - b.order);
  }, [tasks]);

  const getAllDescendants = useCallback((taskId) => {
    const result = [];
    const getChildren = (id) => {
      const children = tasks.filter(t => t.parentId === id);
      children.forEach(child => {
        result.push(child);
        getChildren(child.id);
      });
    };
    getChildren(taskId);
    return result;
  }, [tasks]);

  const getActiveTasksCount = useCallback(() => {
    return tasks.filter(t => t.status === 'active' && !t.parentId).length;
  }, [tasks]);

  const getCompletedTodayCount = useCallback(() => {
    const today = new Date().toDateString();
    return tasks.filter(t => 
      t.status === 'completed' && 
      t.completedAt &&
      new Date(t.completedAt).toDateString() === today
    ).length;
  }, [tasks]);

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
          filterStatus={filterStatus}
          onFilterStatusChange={setFilterStatus}
          filterPriority={filterPriority}
          onFilterPriorityChange={setFilterPriority}
          getActiveTasksCount={getActiveTasksCount}
          getCompletedTodayCount={getCompletedTodayCount}
          totalTasks={tasks.length}
        />
        
        <TaskList 
          tasks={getFilteredTasks()}
          getSubtasks={getSubtasks}
          getTaskProgress={getTaskProgress}
          selectedTask={selectedTask}
          onSelectTask={setSelectedTask}
          onAddTask={addTask}
          onToggleComplete={toggleComplete}
          onDeleteTask={deleteTask}
          onMoveTask={moveTask}
          addSubtask={addSubtask}
          getAllDescendants={getAllDescendants}
        />
        
        <TaskDetails 
          task={selectedTask}
          categories={categories}
          onUpdateTask={updateTask}
          onDeleteTask={deleteTask}
          onAddSubtask={addSubtask}
          getSubtasks={getSubtasks}
          getTaskProgress={getTaskProgress}
          getAllDescendants={getAllDescendants}
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
                  <option value="system">System</option>
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
              <label>
                <input 
                  type="checkbox" 
                  checked={settings.autoBackup}
                  onChange={(e) => saveSettings({...settings, autoBackup: e.target.checked})}
                />
                Auto backup
              </label>
            </div>
            
            <div className="settings-section">
              <h3>Data</h3>
              <button onClick={async () => {
                const data = { tasks, categories, settings };
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
