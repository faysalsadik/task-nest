import React, { useState, useRef } from 'react';

function TaskItem({ 
  task, 
  getSubtasks, 
  getTaskProgress, 
  selectedTask, 
  onSelectTask,
  onToggleComplete, 
  onDeleteTask,
  onMoveTask,
  addSubtask,
  getAllDescendants,
  level = 0
}) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [isDragging, setIsDragging] = useState(false);
  const [isAddingSubtask, setIsAddingSubtask] = useState(false);
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');
  const subtaskInputRef = useRef(null);
  
  const subtasks = getSubtasks(task.id);
  const progress = getTaskProgress(task.id);
  const hasSubtasks = subtasks.length > 0;
  const descendants = getAllDescendants(task.id);
  const allDescendantsCompleted = descendants.length > 0 && descendants.every(d => d.status === 'completed');

  const handleDragStart = (e) => {
    setIsDragging(true);
    e.dataTransfer.setData('taskId', task.id);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragEnd = () => {
    setIsDragging(false);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const draggedTaskId = e.dataTransfer.getData('taskId');
    if (draggedTaskId && draggedTaskId !== task.id) {
      const descendants = getAllDescendants(draggedTaskId);
      if (!descendants.some(d => d.id === task.id)) {
        onMoveTask(draggedTaskId, task.id, 0);
      }
    }
  };

  const handleAddSubtask = () => {
    if (newSubtaskTitle.trim()) {
      addSubtask(task.id, newSubtaskTitle.trim());
      setNewSubtaskTitle('');
      setIsAddingSubtask(false);
    }
  };

  const isSelected = selectedTask && selectedTask.id === task.id;
  const isCompleted = task.status === 'completed';

  return (
    <div className="task-item-wrapper">
      <div 
        className={`task-item ${isSelected ? 'selected' : ''} ${isCompleted ? 'completed' : ''} ${isDragging ? 'dragging' : ''}`}
        style={{ paddingLeft: `${12 + level * 24}px` }}
        onClick={() => onSelectTask(task)}
        draggable
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        <div className="task-checkbox" onClick={(e) => {
          e.stopPropagation();
          onToggleComplete(task.id);
        }}>
          <input 
            type="checkbox" 
            checked={isCompleted}
            onChange={() => {}}
          />
          <span className="checkmark"></span>
        </div>
        
        <div className="task-content">
          <div className="task-title">{task.title}</div>
          {task.dueDate && (
            <div className={`task-due-date ${new Date(task.dueDate) < new Date() && !isCompleted ? 'overdue' : ''}`}>
              {new Date(task.dueDate).toLocaleDateString()}
            </div>
          )}
        </div>
        
        {task.priority !== 'none' && (
          <span className={`priority-indicator ${task.priority}`}></span>
        )}
        
        {progress && (
          <div className="task-progress">
            <span>{progress.completed}/{progress.total}</span>
          </div>
        )}
        
        {hasSubtasks && (
          <button 
            className="expand-btn"
            onClick={(e) => {
              e.stopPropagation();
              setIsExpanded(!isExpanded);
            }}
          >
            {isExpanded ? '▼' : '▶'}
          </button>
        )}
        
        <button 
          className="add-subtask-btn"
          onClick={(e) => {
            e.stopPropagation();
            setIsAddingSubtask(true);
            setTimeout(() => subtaskInputRef.current?.focus(), 0);
          }}
          title="Add subtask"
        >
          +
        </button>
        
        <button 
          className="delete-btn"
          onClick={(e) => {
            e.stopPropagation();
            if (confirm('Delete this task and all subtasks?')) {
              onDeleteTask(task.id);
            }
          }}
          title="Delete"
        >
          ×
        </button>
      </div>
      
      {isAddingSubtask && (
        <div className="add-subtask-form" style={{ paddingLeft: `${36 + level * 24}px` }}>
          <input
            ref={subtaskInputRef}
            type="text"
            placeholder="Subtask title..."
            value={newSubtaskTitle}
            onChange={(e) => setNewSubtaskTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleAddSubtask();
              if (e.key === 'Escape') setIsAddingSubtask(false);
            }}
            onBlur={() => {
              if (!newSubtaskTitle.trim()) setIsAddingSubtask(false);
            }}
          />
        </div>
      )}
      
      {isExpanded && hasSubtasks && (
        <div className="subtasks">
          {subtasks.map(subtask => (
            <TaskItem
              key={subtask.id}
              task={subtask}
              getSubtasks={getSubtasks}
              getTaskProgress={getTaskProgress}
              selectedTask={selectedTask}
              onSelectTask={onSelectTask}
              onToggleComplete={onToggleComplete}
              onDeleteTask={onDeleteTask}
              onMoveTask={onMoveTask}
              addSubtask={addSubtask}
              getAllDescendants={getAllDescendants}
              level={level + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function TaskList({ 
  tasks, 
  getSubtasks, 
  getTaskProgress, 
  selectedTask, 
  onSelectTask,
  onAddTask, 
  onToggleComplete, 
  onDeleteTask,
  onMoveTask,
  addSubtask,
  getAllDescendants
}) {
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const inputRef = useRef(null);

  const handleAddTask = () => {
    if (newTaskTitle.trim()) {
      onAddTask(newTaskTitle.trim());
      setNewTaskTitle('');
    }
  };

  const sortedTasks = [...tasks].sort((a, b) => a.order - b.order);

  return (
    <main className="task-list">
      <div className="task-list-header">
        <input
          ref={inputRef}
          type="text"
          placeholder="Add a new task..."
          value={newTaskTitle}
          onChange={(e) => setNewTaskTitle(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleAddTask();
          }}
          className="new-task-input"
        />
        <button onClick={handleAddTask} className="add-task-btn">
          Add Task
        </button>
      </div>
      
      <div className="task-list-content">
        {sortedTasks.length === 0 ? (
          <div className="empty-state">
            <p>No tasks yet</p>
            <p className="hint">Add a task above to get started</p>
          </div>
        ) : (
          sortedTasks.map(task => (
            <TaskItem
              key={task.id}
              task={task}
              getSubtasks={getSubtasks}
              getTaskProgress={getTaskProgress}
              selectedTask={selectedTask}
              onSelectTask={onSelectTask}
              onToggleComplete={onToggleComplete}
              onDeleteTask={onDeleteTask}
              onMoveTask={onMoveTask}
              addSubtask={addSubtask}
              getAllDescendants={getAllDescendants}
            />
          ))
        )}
      </div>
    </main>
  );
}

export default TaskList;
