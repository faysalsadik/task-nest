import React, { useState } from 'react';

function Sidebar({ 
  categories, 
  selectedCategory, 
  onSelectCategory, 
  onAddCategory,
  onDeleteCategory,
  filterStatus,
  onFilterStatusChange,
  filterPriority,
  onFilterPriorityChange,
  getActiveTasksCount,
  getCompletedTodayCount,
  totalTasks
}) {
  const [newCategoryName, setNewCategoryName] = useState('');
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [categoryColor, setCategoryColor] = useState('#4A90E2');

  const handleAddCategory = () => {
    if (newCategoryName.trim()) {
      onAddCategory(newCategoryName.trim(), categoryColor);
      setNewCategoryName('');
      setShowAddCategory(false);
    }
  };

  const colors = ['#4A90E2', '#27AE60', '#F39C12', '#E74C3C', '#9B59B6', '#1ABC9C', '#34495E', '#E91E63'];

  return (
    <aside className="sidebar">
      <div className="sidebar-section">
        <h3>Tasks</h3>
        <ul className="category-list">
          <li 
            className={selectedCategory === 'all' ? 'active' : ''}
            onClick={() => onSelectCategory('all')}
          >
            <span className="category-icon">📋</span>
            All Tasks
            <span className="count">{totalTasks}</span>
          </li>
        </ul>
      </div>

      <div className="sidebar-section">
        <h3>Status</h3>
        <ul className="category-list">
          <li 
            className={filterStatus === 'all' ? 'active' : ''}
            onClick={() => onFilterStatusChange('all')}
          >
            <span className="category-icon">☰</span>
            All
          </li>
          <li 
            className={filterStatus === 'active' ? 'active' : ''}
            onClick={() => onFilterStatusChange('active')}
          >
            <span className="category-icon">○</span>
            Active
            <span className="count">{getActiveTasksCount()}</span>
          </li>
          <li 
            className={filterStatus === 'completed' ? 'active' : ''}
            onClick={() => onFilterStatusChange('completed')}
          >
            <span className="category-icon">✓</span>
            Completed
            <span className="count">{getCompletedTodayCount()}</span>
          </li>
        </ul>
      </div>

      <div className="sidebar-section">
        <h3>Priority</h3>
        <ul className="category-list">
          <li 
            className={filterPriority === 'all' ? 'active' : ''}
            onClick={() => onFilterPriorityChange('all')}
          >
            All
          </li>
          <li 
            className={filterPriority === 'high' ? 'active' : ''}
            onClick={() => onFilterPriorityChange('high')}
          >
            <span className="priority-dot high"></span>
            High
          </li>
          <li 
            className={filterPriority === 'medium' ? 'active' : ''}
            onClick={() => onFilterPriorityChange('medium')}
          >
            <span className="priority-dot medium"></span>
            Medium
          </li>
          <li 
            className={filterPriority === 'low' ? 'active' : ''}
            onClick={() => onFilterPriorityChange('low')}
          >
            <span className="priority-dot low"></span>
            Low
          </li>
        </ul>
      </div>

      <div className="sidebar-section">
        <h3>
          Categories
          <button className="add-btn" onClick={() => setShowAddCategory(!showAddCategory)}>+</button>
        </h3>
        
        {showAddCategory && (
          <div className="add-category-form">
            <input
              type="text"
              placeholder="Category name"
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddCategory()}
            />
            <div className="color-picker">
              {colors.map(color => (
                <span
                  key={color}
                  className={`color-option ${categoryColor === color ? 'selected' : ''}`}
                  style={{ backgroundColor: color }}
                  onClick={() => setCategoryColor(color)}
                ></span>
              ))}
            </div>
            <button onClick={handleAddCategory}>Add</button>
          </div>
        )}
        
        <ul className="category-list">
          {categories.map(category => (
            <li 
              key={category.id}
              className={selectedCategory === category.id ? 'active' : ''}
              onClick={() => onSelectCategory(category.id)}
            >
              <span className="category-color" style={{ backgroundColor: category.color }}></span>
              {category.name}
              <button 
                className="delete-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  onDeleteCategory(category.id);
                }}
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      </div>
    </aside>
  );
}

export default Sidebar;
