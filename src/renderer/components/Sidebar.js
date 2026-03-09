import React, { useState } from 'react';

function Sidebar({ 
  categories, 
  selectedCategory, 
  onSelectCategory, 
  onAddCategory,
  onDeleteCategory,
  filterPriority,
  onFilterPriorityChange,
  totalTasks,
  columns,
  onAddColumn,
  onDeleteColumn
}) {
  const [newCategoryName, setNewCategoryName] = useState('');
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [categoryColor, setCategoryColor] = useState('#4A90E2');
  const [newColumnName, setNewColumnName] = useState('');
  const [showAddColumn, setShowAddColumn] = useState(false);

  const handleAddCategory = () => {
    if (newCategoryName.trim()) {
      onAddCategory(newCategoryName.trim(), categoryColor);
      setNewCategoryName('');
      setShowAddCategory(false);
    }
  };

  const handleAddColumn = () => {
    if (newColumnName.trim()) {
      onAddColumn(newColumnName.trim());
      setNewColumnName('');
      setShowAddColumn(false);
    }
  };

  const colors = ['#4A90E2', '#27AE60', '#F39C12', '#E74C3C', '#9B59B6', '#1ABC9C', '#34495E', '#E91E63'];

  return (
    <aside className="sidebar">
      <div className="sidebar-section">
        <h3>All Tasks</h3>
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

      <div className="sidebar-section">
        <h3>
          Columns
          <button className="add-btn" onClick={() => setShowAddColumn(!showAddColumn)}>+</button>
        </h3>
        
        {showAddColumn && (
          <div className="add-category-form">
            <input
              type="text"
              placeholder="Column name"
              value={newColumnName}
              onChange={(e) => setNewColumnName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddColumn()}
            />
            <button onClick={handleAddColumn}>Add</button>
          </div>
        )}
        
        <ul className="category-list">
          {columns.map(column => (
            <li key={column.id}>
              <span className="column-icon">▦</span>
              {column.title}
            </li>
          ))}
        </ul>
      </div>
    </aside>
  );
}

export default Sidebar;
