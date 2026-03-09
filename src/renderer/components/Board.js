import React, { useState } from 'react';

function Column({ 
  column, 
  tasks, 
  onAddTask, 
  onUpdateTask, 
  onDeleteTask, 
  onToggleComplete,
  onDragStart,
  onDragOver,
  onDrop,
  draggedColumn,
  onTaskDragStart,
  onTaskDragOver,
  onTaskDrop,
  draggedTask
}) {
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [isDraggingOver, setIsDraggingOver] = useState(false);

  const handleAddTask = () => {
    if (newTaskTitle.trim()) {
      onAddTask(newTaskTitle.trim(), column.id);
      setNewTaskTitle('');
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDraggingOver(true);
    onDragOver(e);
  };

  const handleDragLeave = () => {
    setIsDraggingOver(false);
  };

  const handleDrop = (e) => {
    setIsDraggingOver(false);
    onTaskDrop(e, column.id);
  };

  return (
    <div 
      className={`column ${draggedColumn?.id === column.id ? 'dragging' : ''} ${isDraggingOver ? 'drag-over' : ''}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <div 
        className="column-header"
        draggable
        onDragStart={(e) => onDragStart(e, column)}
        onDragOver={onDragOver}
        onDrop={(e) => onDrop(e, column)}
      >
        <h3>{column.title}</h3>
        <span className="task-count">{tasks.length}</span>
      </div>
      
      <div className="column-content">
        {tasks.map(task => (
          <div 
            key={task.id}
            className={`task-card ${task.status === 'done' ? 'completed' : ''} ${draggedTask?.task.id === task.id ? 'dragging' : ''}`}
            draggable
            onDragStart={(e) => onTaskDragStart(e, task, column.id)}
            onDragOver={onTaskDragOver}
            onDragEnd={() => {}}
          >
            <div className="task-card-header">
              <span className={`priority-dot ${task.priority}`}></span>
              <span className="task-title">{task.title}</span>
            </div>
            
            {task.description && (
              <p className="task-description">{task.description}</p>
            )}
            
            <div className="task-card-footer">
              {task.dueDate && (
                <span className={`due-date ${new Date(task.dueDate) < new Date() ? 'overdue' : ''}`}>
                  {new Date(task.dueDate).toLocaleDateString()}
                </span>
              )}
              
              <div className="task-actions">
                <button 
                  className="complete-btn"
                  onClick={() => onToggleComplete(task.id)}
                  title={task.status === 'done' ? 'Mark as todo' : 'Mark as done'}
                >
                  {task.status === 'done' ? '↩' : '✓'}
                </button>
                <button 
                  className="delete-btn"
                  onClick={() => {
                    if (confirm('Delete this task?')) {
                      onDeleteTask(task.id);
                    }
                  }}
                  title="Delete"
                >
                  ×
                </button>
              </div>
            </div>
          </div>
        ))}
        
        {tasks.length === 0 && (
          <div className="empty-column">
            <p>No tasks</p>
          </div>
        )}
      </div>
      
      <div className="column-footer">
        <input
          type="text"
          placeholder="+ Add task"
          value={newTaskTitle}
          onChange={(e) => setNewTaskTitle(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleAddTask();
          }}
          className="add-task-input"
        />
      </div>
    </div>
  );
}

function Board({ 
  columns,
  tasks,
  getFilteredTasks,
  onAddTask,
  onUpdateTask,
  onDeleteTask,
  onToggleComplete,
  onMoveTask,
  handleColumnDragStart,
  handleColumnDragOver,
  handleColumnDrop,
  draggedColumn,
  handleTaskDragStart,
  handleTaskDragOver,
  handleTaskDrop,
  draggedTask
}) {
  return (
    <main className="board">
      <div className="board-columns">
        {columns.sort((a, b) => a.order - b.order).map(column => (
          <Column
            key={column.id}
            column={column}
            tasks={getFilteredTasks(column.id)}
            onAddTask={onAddTask}
            onUpdateTask={onUpdateTask}
            onDeleteTask={onDeleteTask}
            onToggleComplete={onToggleComplete}
            onDragStart={handleColumnDragStart}
            onDragOver={handleColumnDragOver}
            onDrop={handleColumnDrop}
            draggedColumn={draggedColumn}
            onTaskDragStart={handleTaskDragStart}
            onTaskDragOver={handleTaskDragOver}
            onTaskDrop={handleTaskDrop}
            draggedTask={draggedTask}
          />
        ))}
      </div>
    </main>
  );
}

export default Board;
