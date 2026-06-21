// Matrix View Renderer
window.renderMatrixView = function() {
  const gridBody = document.getElementById('grid-body');
  const gridHead = document.getElementById('grid-head');
  
  if (!gridBody || !gridHead) return;
  
  const activeView = window.App.activeViewId ? window.App.db.views.find(v => v.id === window.App.activeViewId) : null;
  
  // Get all items that pass the filters (excluding trash if not trash view)
  const isTrashView = activeView && activeView.reserved && activeView.id === 'view-trash';
  const filters = window.App.filters;
  
  let passedItems = [];
  for (const item of window.App.db.items) {
    if (isTrashView !== item.deleted) continue;
    
    let passesFilter = true;
    if (filters.showDone === false && item.done) passesFilter = false;
    
    if (passesFilter && filters.text && !item.text.toLowerCase().includes(filters.text)) passesFilter = false;
    
    if (passesFilter && filters.assignee) {
      const assigneeName = window.App.db.getCategoryAssignmentName(item, 'root-who') || '';
      if (!assigneeName.toLowerCase().includes(filters.assignee)) passesFilter = false;
    }
    
    if (passesFilter) {
      passedItems.push(item);
    }
  }

  // Determine row categories (Y axis) and col categories (X axis)
  const rowParentId = activeView && activeView.sectionCategoryId ? activeView.sectionCategoryId : null;
  const colParentId = activeView && activeView.columnCategoryId ? activeView.columnCategoryId : null;
  
  let rowCats = [];
  if (rowParentId) {
    rowCats = window.App.db.getDescendants(rowParentId).map(id => window.App.db.categories[id]);
    if (rowCats.length === 0) {
      rowCats = [window.App.db.categories[rowParentId]].filter(Boolean);
    }
  }
  
  let colCats = [];
  if (colParentId) {
    colCats = window.App.db.getDescendants(colParentId).map(id => window.App.db.categories[id]);
    // If the selected category has no subcategories yet, just use the category itself as a single column
    if (colCats.length === 0) {
      colCats = [window.App.db.categories[colParentId]].filter(Boolean);
    }
  }
  
  // If no columns are defined, try to use Who and Status as fallback columns to ensure it looks like a matrix
  if (colCats.length === 0) {
    const defaultCols = ['root-who', 'root-status'];
    colCats = defaultCols
      .map(id => window.App.db.categories[id])
      .filter(Boolean);
  }
  const matrixHead = document.getElementById('matrix-head');
  if (matrixHead) {
    // Save existing widths to preserve them during re-renders (like filtering)
    const existingWidths = [];
    matrixHead.querySelectorAll('th').forEach(th => existingWidths.push(th.style.width));

    matrixHead.innerHTML = '';
    const headerRow = document.createElement('tr');
    
    let thIndex = 0;
    const applyWidth = (th) => {
      if (existingWidths[thIndex]) th.style.width = existingWidths[thIndex];
      thIndex++;
    };
    
    const thRowLabel = document.createElement('th');
    thRowLabel.className = 'col-header';
    thRowLabel.textContent = rowParentId ? window.App.db.categories[rowParentId].name : 'Group';
    applyWidth(thRowLabel);
    headerRow.appendChild(thRowLabel);
    
    if (colCats.length === 0) {
      const thAll = document.createElement('th');
      thAll.className = 'col-header';
      thAll.textContent = 'Items';
      applyWidth(thAll);
      headerRow.appendChild(thAll);
    } else {
      colCats.forEach(cat => {
        const th = document.createElement('th');
        th.className = 'col-header';
        th.textContent = cat.name;
        applyWidth(th);
        headerRow.appendChild(th);
      });
    }
    
    // Also add an Unassigned column if there are column categories
    if (colCats.length > 0) {
      const thUnassigned = document.createElement('th');
      thUnassigned.className = 'col-header';
      thUnassigned.textContent = '(Unassigned Col)';
      applyWidth(thUnassigned);
      headerRow.appendChild(thUnassigned);
    }
    
    matrixHead.appendChild(headerRow);
  }
  
  // Rebuild Table Body
  gridBody.innerHTML = '';
  
  // Group items by row and then by col
  // Row => Map of ColId -> Items Array
  const matrix = new Map();
  const unassignedRows = [];
  
  rowCats.forEach(rc => matrix.set(rc.id, new Map()));
  
  passedItems.forEach(item => {
    // Find which row cat it belongs to
    let assignedRowCats = rowCats.filter(rc => item.assignments.has(rc.id));
    if (assignedRowCats.length === 0) {
      assignedRowCats = [{ id: 'unassigned', name: '(Unassigned)' }];
    }
    
    // Find which col cat it belongs to
    let assignedColCats = colCats.filter(cc => item.assignments.has(cc.id));
    if (assignedColCats.length === 0) {
      assignedColCats = [{ id: 'unassigned', name: '(Unassigned Col)' }];
    }
    
    assignedRowCats.forEach(rc => {
      let rowMap = matrix.get(rc.id);
      if (!rowMap) {
        rowMap = new Map();
        matrix.set(rc.id, rowMap);
      }
      
      assignedColCats.forEach(cc => {
        let itemsArr = rowMap.get(cc.id) || [];
        itemsArr.push(item);
        rowMap.set(cc.id, itemsArr);
      });
    });
  });
  
  // Render Rows
  const renderMatrixRow = (rowCatId, rowName) => {
    const rowMap = matrix.get(rowCatId) || new Map();
    const tr = document.createElement('tr');
    tr.dataset.matrixRow = rowCatId;
    
    const tdLabel = document.createElement('td');
    tdLabel.innerHTML = `<strong>${rowName}</strong>`;
    tr.appendChild(tdLabel);
    
    const renderCell = (colCatId) => {
      const td = document.createElement('td');
      td.className = 'matrix-cell';
      td.style.verticalAlign = 'top';
      const items = rowMap.get(colCatId) || [];
      
      if (items.length === 0) {
        td.innerHTML = '<span style="color: var(--text-muted); opacity: 0.5;">-</span>';
      } else {
        const ul = document.createElement('ul');
        items.forEach(it => {
          const li = document.createElement('li');
          // Cleanly display the item text
          const safeText = (it.text || '').replace(/</g, '&lt;').replace(/>/g, '&gt;');
          li.innerHTML = `${safeText}`;
          ul.appendChild(li);
        });
        td.appendChild(ul);
      }
      tr.appendChild(td);
    };
    
    if (colCats.length === 0) {
      renderCell('unassigned');
    } else {
      colCats.forEach(cc => renderCell(cc.id));
      renderCell('unassigned');
    }
    
    gridBody.appendChild(tr);
  };
  
  rowCats.forEach(rc => {
    // Only render row if it has items or if we want to show empty rows
    const rowMap = matrix.get(rc.id);
    let hasItems = false;
    if (rowMap) {
      for (const val of rowMap.values()) {
        if (val && val.length > 0) hasItems = true;
      }
    }
    if (hasItems) {
      renderMatrixRow(rc.id, rc.name);
    }
  });
  
  // Render Unassigned Row
  const unassignedRowMap = matrix.get('unassigned');
  if (unassignedRowMap) {
    let hasItems = false;
    for (const val of unassignedRowMap.values()) {
      if (val && val.length > 0) hasItems = true;
    }
    if (hasItems) {
      renderMatrixRow('unassigned', '(Unassigned)');
    }
  }

  // Update focus for Matrix View (not fully interactive like Outliner yet, but highlight visually if needed)
  // For now, Matrix is read-only analytical mode
};
