import React, { useState, useEffect } from 'react';

function TaskDetails({ 
  task, 
  categories, 
  onUpdateTask, 
  onDeleteTask,
  onAddSubtask,
  getSubtasks,
  getTaskProgress,
  getAllDescendants
}) {
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editPriority, setEditPriority] = useState('none');
  const [editCategory, setEditCategory] = useState('');
  const [editDueDate, setEditDueDate] = useState('');
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');

  useEffect(() => {
    if (task) {
      setEditTitle(task.title);
      setEditDescription(task.description || '');
      setEditPriority(task.priority || 'none');
      setEditCategory(task.categoryId || '');
      setEditDueDate(task.dueDate ? task.dueDate.split('T')[0] : '');
    }
  }, [task]);

  if (!task) {
    return (
      <aside className="task-details empty">
        <div className="empty-state">
          <p>Select a task to view details</p>
        </div>
      </aside>
    );
  }

  const handleSave = () => {
    onUpdateTask(task.id, {
      title: editTitle,
      description: editDescription,
      priority: editPriority,
      categoryId: editCategory || null,
      dueDate: editDueDate ? new Date(editDueDate).toISOString() : null
    });
  };

  const handleAddSubtask = () => {
    if (newSubtaskTitle.trim()) {
      onAddSubtask(task.id, newSubtaskTitle.trim());
      setNewSubtaskTitle('');
    }
  };

  const subtasks = getSubtasks(task.id);
  const progress = getTaskProgress(task.id);
  const descendants = getAllDescendants(task.id);

  return (
    <aside className="task-details">
      <div className="task-details-header">
        <h2>Task Details</h2>
        <button 
          className="delete-btn"
          onClick={() => {
            if (confirm('Delete this task and all subtasks?')) {
              onDeleteTask(task.id);
            }
          }}
        >
          Delete
        </button>
      </div>
      
      <div className="task-details-content">
        <div className="form-group">
          <label>Title</label>
          <input
            type="text"
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            onBlur={handleSave}
            maxLength={200}
          />
        </div>
        
        <div className="form-group">
          <label>Description</label>
          <textarea
            value={editDescription}
            onChange={(e) => setEditDescription(e.target.value)}
            onBlur={handleSave}
            rows={4}
            maxLength={5000}
            placeholder="Add a description..."
          />
        </div>
        
        <div className="form-row">
          <div className="form-group">
            <label>Priority</label>
            <select 
              value={editPriority} 
              onChange={(e) => {
                setEditPriority(e.target.value);
                onUpdateTask(task.id, { priority: e.target.value });
              }}
            >
              <option value="none">None</option>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
          </div>
          
          <div className="form-group">
            <label>Category</label>
            <select 
              value={editCategory} 
              onChange={(e) => {
                setEditCategory(e.target.value);
                onUpdateTask(task.id, { categoryId: e.target.value || null });
              }}
            >
              <option value="">None</option>
              {categories.map(cat => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
            </select>
          </div>
        </div>
        
        <div className="form-group">
          <label>Due Date</label>
          <input
            type="date"
            value={editDueDate}
            onChange={(e) => {
              setEditDueDate(e.target.value);
              onUpdateTask(task.id, { 
                dueDate: e.target.value ? new Date(e.target.value).toISOString() : null 
              });
            }}
          />
        </div>
        
        <div className="form-group">
          <label>Status</label>
          <span className={`status-badge ${task.status}`}>
            {task.status === 'completed' ? 'Completed' : 'Active'}
          </span>
        </div>
        
        {progress && (
          <div className="form-group">
            <label>Progress</label>
            <div className="progress-bar">
              <div 
                className="progress-fill"
                style={{ width: `${(progress.completed / progress.total) * 100}%` }}
              ></div>
            </div>
            <span className="progress-text">{progress.completed} of {progress.total} subtasks completed</span>
          </div>
        )}
        
        <div className="form-group">
          <label>Subtasks ({subtasks.length})</label>
          
          <div className="add-subtask-inline">
            <input
              type="text"
              placeholder="Add subtask..."
              value={newSubtaskTitle}
              onChange={(e) => setNewSubtaskTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleAddSubtask();
              }}
            />
            <button onClick={handleAddSubtask}>+</button>
          </div>
          
          {subtasks.length > 0 && (
            <ul className="subtask-list">
              {subtasks.map(subtask => (
                <li key={subtask.id} className={subtask.status === 'completed' ? 'completed' : ''}>
                  <span className="subtask-title">{subtask.title}</span>
                  <span className={`priority-dot ${subtask.priority}`}></span>
                </li>
              ))}
            </ul>
          )}
        </div>
        
        {descendants.length > 0 && (
          <div className="form-group">
            <label>Total: {descendants.length + 1} tasks (including nested)</label>
          </div>
        )}
        
        <div className="task-meta">
          <p>Created: {new Date(task.createdAt).toLocaleString()}</p>
          <p>Updated: {new Date(task.updatedAt).toLocaleString()}</p>
          {task.completedAt && (
            <p>Completed: {new Date(task.completedAt).toLocaleString()}</p>
          )}
        </div>
      </div>
    </aside>
  );
}

export default TaskDetails;
