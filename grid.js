const gridBody = document.getElementById('grid-body');

// Initialize Database Engine
window.App.init(new AgendaDatabase());

// Seed Initial Dummy Data into Database
window.App.db.addCategory('who-john', 'John', 'root-who', { synonyms: ['johnny'] });
window.App.db.addCategory('who-mary', 'Mary', 'root-who');

const item1 = window.App.db.addItem('Finish project proposal', 0);
item1.due = '2026-06-20'; item1.entry = '2026-06-15'; item1.notes = { text: 'Need to research Q3 numbers before drafting.', assignee: 'John is the lead dev.' };
window.App.db.assignCategory(item1, 'who-john');

const item2 = window.App.db.addItem('Review budget', 1);
item2.due = '2026-06-18'; item2.entry = '2026-06-15';
window.App.db.assignCategory(item2, 'who-mary');

const item3 = window.App.db.addItem('Call client', 0);
item3.due = '2026-06-16'; item3.entry = '2026-06-15';



let activeColIndex = 0;

function escapeHtml(unsafe) {
  return (unsafe || '')
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function parseMarkdownLine(text) {
  if (!text) return '';
  
  let html = '';
  const filterStr = window.App.filters && window.App.filters.text ? window.App.filters.text : '';
  
  if (filterStr) {
    const escapedFilter = filterStr.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`(${escapedFilter})`, 'gi');
    const parts = text.split(regex);
    for (let i = 0; i < parts.length; i++) {
      if (i % 2 === 1) { // Matched part
        html += `<mark>${escapeHtml(parts[i])}</mark>`;
      } else {
        html += escapeHtml(parts[i]);
      }
    }
  } else {
    html = escapeHtml(text);
  }

  // Bold: **text** or __text__
  html = html.replace(/\*\*([^\*]+)\*\*/g, '<b>$1</b>');
  html = html.replace(/__([^_]+)__/g, '<b>$1</b>');
  // Italic: *text* or _text_
  html = html.replace(/\*([^\*]+)\*/g, '<i>$1</i>');
  html = html.replace(/_([^_]+)_/g, '<i>$1</i>');
  // Strikethrough: ~~text~~
  html = html.replace(/~~([^~]+)~~/g, '<del>$1</del>');
  return html;
}

window.cutActiveRow = function() {
  if (window.App.db.items.length === 0) return;
  const visibleRows = getVisibleRows();
  const activeItem = visibleRows[window.App.activeRowIndex];
  if (!activeItem) return;
  
  const actualIndex = activeItem.index;
  const rootDepth = activeItem.row.depth;
  
  // Find how many children to cut
  let cutCount = 1;
  for (let i = actualIndex + 1; i < window.App.db.items.length; i++) {
    if (window.App.db.items[i].depth > rootDepth) {
      cutCount++;
    } else {
      break;
    }
  }
  
  window.App.clipboard = window.App.db.items.splice(actualIndex, cutCount);
  
  // Adjust window.App.activeRowIndex if we cut the last row
  const newVisibleRows = getVisibleRows();
  if (window.App.activeRowIndex >= newVisibleRows.length) {
    window.App.activeRowIndex = Math.max(0, newVisibleRows.length - 1);
  }
  
  renderGrid();
};

window.pasteRows = function() {
  if (window.App.clipboard.length === 0) return;
  
  const visibleRows = getVisibleRows();
  const activeItem = visibleRows[window.App.activeRowIndex];
  
  const actualIndex = activeItem ? activeItem.index : -1;
  const insertIndex = actualIndex + 1;
  const targetDepth = activeItem ? activeItem.row.depth : 0;
  
  // Clone the clipboard to allow multiple pastes
  const rootOldDepth = window.App.clipboard[0].depth;
  const depthDiff = targetDepth - rootOldDepth;
  
  const rowsToPaste = window.App.clipboard.map(row => {
    // Clone the row, notes, and assignments Set
    const newRow = { 
      ...row, 
      id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
      depth: Math.max(0, row.depth + depthDiff),
      notes: { ...row.notes },
      assignments: new Set(row.assignments)
    };
    return newRow;
  });
  
  window.App.db.items.splice(insertIndex, 0, ...rowsToPaste);
  
  // Move focus to the newly pasted root item
  if (activeItem) {
    window.App.activeRowIndex++;
  }
  
  renderGrid();
};

function getVisibleRows() {
  const visible = [];
  let hideDepth = -1;
  
  // Default filter state if not yet loaded
  const filters = window.App.filters || { text: '', assignee: '', showDone: false };

  // Find if we are in Trash View
  const activeView = window.App.db.views.find(v => v.id === window.App.activeViewId);
  const isTrashView = activeView && activeView.reserved && activeView.name === 'Trash View';

  for (let i = 0; i < window.App.db.items.length; i++) {
    const row = window.App.db.items[i];

    // If we are hiding children of a collapsed node
    if (hideDepth !== -1) {
      if (row.depth > hideDepth) {
        continue; // Skip this row
      } else {
        // We've reached a sibling or parent, stop hiding
        hideDepth = -1;
      }
    }
    
    // Check if this row passes the filters
    let passesFilter = true;
    
    // 0. Trash filter
    if (isTrashView) {
      if (!row.deleted) passesFilter = false;
    } else {
      if (row.deleted) passesFilter = false;
    }
    
    // 1. Completion filter
    if (passesFilter && !filters.showDone && row.done) {
      passesFilter = false;
    }
    
    // 2. Text filter
    if (passesFilter && filters.text) {
      const matchText = filters.text.toLowerCase();
      let hasMatch = row.text.toLowerCase().includes(matchText);
      
      // Also match against assigned category names
      if (!hasMatch && row.assignments && row.assignments.size > 0) {
        for (const catId of row.assignments) {
          const cat = window.App.db.categories[catId];
          if (cat && cat.name.toLowerCase().includes(matchText)) {
            hasMatch = true;
            break;
          }
        }
      }
      
      if (!hasMatch) {
        passesFilter = false;
      }
    }
    
    // 3. Assignee filter
    const rowAssignee = window.App.db.getCategoryAssignmentName(row, 'root-who') || row.assignee || '';
    if (passesFilter && filters.assignee) {
      if (!rowAssignee.toLowerCase().includes(filters.assignee)) {
        passesFilter = false;
      }
    }

    if (passesFilter) {
      visible.push({ row, index: i });
    }

    // If this node is collapsed, we should hide its children
    if (!row.isSectionHeader && row.collapsed) {
      hideDepth = row.depth;
    }
  }

  // If in Trash View, also add deleted categories as pseudo-items
  if (isTrashView) {
    for (const catId in window.App.db.categories) {
      const cat = window.App.db.categories[catId];
      if (cat.deleted) {
        visible.push({
          row: { id: catId, text: `[Category] ${cat.name}`, depth: 0, done: false, isCategoryPseudoItem: true },
          index: catId
        });
      }
    }
  }

  if (activeView && activeView.sectionCategoryId) {
    return window.App.db.groupItemsBySection(visible, activeView.sectionCategoryId, window.App.collapsedSections);
  }

  return visible;
}

window.getActiveRowData = function() {
  const visibleRows = getVisibleRows();
  const visibleItem = visibleRows[window.App.activeRowIndex];
  return visibleItem ? visibleItem.row : null;
};

window.getActiveCellNote = function() {
  const row = window.getActiveRowData();
  if (!row) return '';
  const cellKeys = ['text', 'assignee', 'due', 'entry'];
  const cellKey = cellKeys[activeColIndex];
  return row.notes && row.notes[cellKey] ? row.notes[cellKey] : '';
};

window.updateActiveCellNote = function(noteText) {
  const row = window.getActiveRowData();
  if (row) {
    if (!row.notes) row.notes = {};
    const cellKeys = ['text', 'assignee', 'due', 'entry'];
    const cellKey = cellKeys[activeColIndex];
    row.notes[cellKey] = noteText;
  }
};

window.triggerGridEdit = function() {
  const row = window.getActiveRowData();
  if (!row) return;
  const visibleRows = getVisibleRows();
  const actualIndex = visibleRows[window.App.activeRowIndex].index;
  
  const tr = gridBody.querySelector(`.grid-row[data-index="${actualIndex}"]`);
  if (!tr) return;
  const td = tr.querySelectorAll('.grid-cell')[activeColIndex];
  const cellKeys = ['text', 'assignee', 'due', 'entry'];
  const key = cellKeys[activeColIndex];
  
  triggerInlineEdit(actualIndex, activeColIndex, td, key, row.depth);
};

function triggerInlineEdit(rIndex, cIndex, tdElement, cellKey, depth) {
  if (tdElement.querySelector('input')) return; // Already editing
  
  let currentText = window.App.db.items[rIndex][cellKey];
  if (currentText === undefined) {
    if (cellKey === 'assignee') {
      currentText = window.App.db.getCategoryAssignmentName(window.App.db.items[rIndex], 'root-who') || '';
    } else if (cellKey === 'due') {
      currentText = window.App.db.getCategoryAssignmentName(window.App.db.items[rIndex], 'root-when') || '';
    } else {
      currentText = '';
    }
  }
  
  tdElement.innerHTML = '';
  
  const input = document.createElement('input');
  input.type = 'text';
  input.value = currentText;
  
  input.style.width = '100%';
  input.style.background = 'transparent';
  input.style.border = '1px solid var(--border-focus)';
  input.style.color = 'inherit';
  input.style.fontFamily = 'inherit';
  input.style.fontSize = 'inherit';
  input.style.outline = 'none';
  
  // Keep padding for item text
  if (cellKey === 'text') {
    input.style.paddingLeft = `${10 + (depth * 20)}px`;
    tdElement.style.paddingLeft = '0'; // Remove padding from td so input spans full width with correct visual indent
  } else {
    input.style.padding = '2px';
  }

  let finished = false;
  const finishEditing = () => {
    if (finished) return;
    finished = true;
    
    const rowId = window.App.db.items[rIndex].id;
    const newVal = input.value;
    
    if (cellKey === 'text') {
      window.App.db.updateItem(rowId, { text: newVal });
    } else if (cellKey === 'assignee') {
      if (newVal) {
        let catId = 'who-' + newVal.toLowerCase().replace(/\s+/g, '-');
        if (!window.App.db.categories[catId]) {
          window.App.db.addCategory(catId, newVal, 'root-who');
        }
        window.App.db.assignCategory(window.App.db.items[rIndex], catId);
      }
    } else if (cellKey === 'due') {
      if (newVal) {
        let parsed = matcher.parseDate(newVal) || newVal;
        let catId = 'date-' + parsed;
        if (!window.App.db.categories[catId]) {
          window.App.db.addCategory(catId, parsed, 'root-when', { indexed: false });
        }
        window.App.db.assignCategory(window.App.db.items[rIndex], catId);
      }
    } else {
      window.App.db.items[rIndex][cellKey] = newVal;
    }
    
    renderGrid(); // Redraw grid with new data
    document.getElementById('grid-container').focus(); // Return focus to grid
  };

  input.addEventListener('blur', finishEditing);
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      e.stopPropagation();
      input.blur();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      input.value = currentText; // Revert
      input.blur();
    }
  });

  tdElement.appendChild(input);
  input.focus();
  input.select();
}

function renderGrid() {
  const activeView = window.App.activeViewId ? window.App.db.views.find(v => v.id === window.App.activeViewId) : null;
  
  const gridHead = document.getElementById('grid-head');
  const matrixHead = document.getElementById('matrix-head');
  
  const viewTitle = document.getElementById('view-title');
  if (viewTitle) {
    if (activeView) {
      const layoutName = activeView.layout === 'matrix' ? 'Matrix Layout' : 'Outliner Layout';
      viewTitle.textContent = `${activeView.name} (${layoutName})`;
    } else {
      viewTitle.textContent = 'Lotus Agenda';
    }
  }

  if (activeView && activeView.layout === 'matrix' && typeof window.renderMatrixView === 'function') {
    if (gridHead) gridHead.classList.add('hidden');
    if (matrixHead) matrixHead.classList.remove('hidden');
    window.renderMatrixView();
    return;
  }
  
  if (gridHead) gridHead.classList.remove('hidden');
  if (matrixHead) matrixHead.classList.add('hidden');
  
  gridBody.innerHTML = '';
  
  const visibleRows = getVisibleRows();
  
  // Ensure window.App.activeRowIndex is within bounds of visible rows
  if (window.App.activeRowIndex >= visibleRows.length) {
    window.App.activeRowIndex = visibleRows.length - 1;
  }
  if (window.App.activeRowIndex < 0) window.App.activeRowIndex = 0;
  
  let currentSectionGroup = null;
  
  visibleRows.forEach((item, visibleIdx) => {
    const tr = document.createElement('div');
    tr.className = 'grid-row';
    tr.dataset.visibleIdx = visibleIdx;
    
    if (item.isSectionHeader) {
      currentSectionGroup = document.createElement('div');
      currentSectionGroup.className = 'section-group';
      gridBody.appendChild(currentSectionGroup);
      
      tr.dataset.section = item.categoryId;
      tr.classList.add('section-header-row');
      
      const td = document.createElement('div');
      td.className = 'grid-cell';
      td.style.gridColumn = '1 / -1';
      td.dataset.col = "0";
      
      const iconSpan = document.createElement('span');
      iconSpan.className = 'section-collapse-icon';
      iconSpan.dataset.sectionId = item.sectionId;
      iconSpan.style.cursor = 'pointer';
      iconSpan.style.marginRight = '4px';
      iconSpan.style.display = 'inline-block';
      iconSpan.style.width = '14px';
      iconSpan.textContent = item.collapsed ? '▶ ' : '▼ ';
      
      td.appendChild(iconSpan);
      
      const titleSpan = document.createElement('strong');
      titleSpan.textContent = item.name.toUpperCase();
      td.appendChild(titleSpan);
      
      if (visibleIdx === window.App.activeRowIndex) {
        td.classList.add('active-cell');
      }
      
      tr.appendChild(td);
      currentSectionGroup.appendChild(tr);
      return;
    }
    
    // Regular Item Row
    const row = item.row;
    const actualIndex = item.index;
    
    tr.dataset.index = actualIndex;
    tr.style.setProperty('--depth', row.depth);
    
    const rowAssignee = window.App.db.getCategoryAssignmentName(row, 'root-who') || row.assignee || '';
    const rowDue = window.App.db.getCategoryAssignmentName(row, 'root-when') || row.due || '';
    
    const cells = [
      { key: 'text', val: row.text, isItem: true },
      { key: 'assignee', val: rowAssignee },
      { key: 'due', val: rowDue },
      { key: 'entry', val: row.entryDate || row.entry }
    ];
    
    cells.forEach((cell, colIndex) => {
      const td = document.createElement('div');
      td.className = 'grid-cell';
      td.dataset.col = colIndex;
      td.dataset.key = cell.key;
      
      if (cell.isItem) {
        td.style.paddingLeft = `${10 + (row.depth * 20)}px`;
        
        const nextRow = window.App.db.items[actualIndex + 1];
        const hasChildren = nextRow && nextRow.depth > row.depth;
        
        const iconSpan = document.createElement('span');
        iconSpan.className = 'item-collapse-icon';
        iconSpan.style.cursor = hasChildren ? 'pointer' : 'default';
        iconSpan.style.marginRight = '4px';
        iconSpan.style.display = 'inline-block';
        iconSpan.style.width = '14px';
        
        if (hasChildren) {
          iconSpan.textContent = row.collapsed ? '▶ ' : '▼ ';
        } else {
          iconSpan.textContent = '• ';
        }
        
        const textSpan = document.createElement('span');
        textSpan.innerHTML = parseMarkdownLine(cell.val);
        
        td.appendChild(iconSpan);
        td.appendChild(textSpan);
      } else {
        td.innerHTML = parseMarkdownLine(cell.val);
      }
      
      if (visibleIdx === window.App.activeRowIndex && colIndex === activeColIndex) {
        td.classList.add('active-cell');
      }
      
      tr.appendChild(td);
    });
    if (currentSectionGroup) {
      currentSectionGroup.appendChild(tr);
    } else {
      gridBody.appendChild(tr);
    }
  });
}

// EVENT DELEGATION
gridBody.addEventListener('click', (e) => {
  // Check if click was on a collapse icon
  if (e.target.classList.contains('section-collapse-icon')) {
    e.stopPropagation();
    const tr = e.target.closest('.grid-row');
    window.App.activeRowIndex = parseInt(tr.dataset.visibleIdx, 10);
    activeColIndex = 0;
    
    const sectionId = e.target.dataset.sectionId;
    window.App.toggleSectionCollapse(sectionId);
    renderGrid();
    return;
  }
  
  if (e.target.classList.contains('item-collapse-icon')) {
    e.stopPropagation();
    const tr = e.target.closest('.grid-row');
    const td = e.target.closest('.grid-cell');
    window.App.activeRowIndex = parseInt(tr.dataset.visibleIdx, 10);
    activeColIndex = parseInt(td.dataset.col, 10);
    
    const actualIndex = parseInt(tr.dataset.index, 10);
    const row = window.App.db.items[actualIndex];
    if (row) {
      row.collapsed = !row.collapsed;
      renderGrid();
    }
    return;
  }
  
  // Update active cell on click
  const td = e.target.closest('.grid-cell');
  if (!td) return;
  const tr = td.closest('.grid-row');
  if (!tr) return;
  
  window.App.activeRowIndex = parseInt(tr.dataset.visibleIdx, 10);
  activeColIndex = parseInt(td.dataset.col, 10) || 0;
  updateFocus();
});

document.getElementById('grid-container').addEventListener('dblclick', (e) => {
  // Only trigger if clicked explicitly on the container or table wrapper (empty space)
  // Ignore clicks inside the table header (TH) or table body cells (TD)
  if (e.target.classList.contains('header-cell') || e.target.closest('.header-cell') || e.target.closest('.grid-cell')) return;
  
  // Double clicked on empty space, create a new item
  window.App.db.addItem('', 0, []);
  renderGrid();
    
    // Trigger edit on the newly created item
    const newRowIndex = getVisibleRows().length - 1;
    if (newRowIndex >= 0) {
      window.App.activeRowIndex = newRowIndex;
      activeColIndex = 0;
      
      const newTr = gridBody.querySelector(`div[data-visible-idx="${newRowIndex}"]`);
      if (newTr) {
        const newTd = newTr.querySelector('.grid-cell[data-col="0"]');
        if (newTd) {
          triggerInlineEdit(window.App.db.items.length - 1, 0, newTd, 'text', 0);
        }
      }
    }
});

// Inline Edit on Double Click
gridBody.addEventListener('dblclick', (e) => {
  const td = e.target.closest('.grid-cell');
  if (!td || td.querySelector('input')) return;
  
  const tr = td.closest('.grid-row');
  if (!tr || tr.classList.contains('section-header-row')) return;
  
  window.App.activeRowIndex = parseInt(tr.dataset.visibleIdx, 10);
  activeColIndex = parseInt(td.dataset.col, 10);
  
  const actualIndex = parseInt(tr.dataset.index, 10);
  const cellKey = td.dataset.key;
  const row = window.App.db.items[actualIndex];
  
  triggerInlineEdit(actualIndex, activeColIndex, td, cellKey, row.depth);
});

function updateFocus() {
  // Remove existing active-cell
  const oldActive = gridBody.querySelector('.active-cell');
  if (oldActive) oldActive.classList.remove('active-cell');
  
  // Find new active cell
  const visibleRows = getVisibleRows();
  if (window.App.activeRowIndex >= 0 && window.App.activeRowIndex < visibleRows.length) {
    const tr = gridBody.querySelector(`div.grid-row[data-visible-idx="${window.App.activeRowIndex}"]`);
    if (tr) {
      const tdList = tr.querySelectorAll('.grid-cell');
      // Section headers only have 1 cell, normal rows have multiple
      const td = tdList.length > activeColIndex ? tdList[activeColIndex] : tdList[0];
      if (td) td.classList.add('active-cell');
    }
  }
  
  if (typeof window.refreshPropertiesPanel === 'function') window.refreshPropertiesPanel('item');
}

document.getElementById('grid-container').addEventListener('keydown', (e) => {
  if (window.commandModeActive) return;
  // Do not intercept keys if we are actively typing in an input
  if (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA') return;

  const visibleRows = getVisibleRows();
  const totalVisibleRows = visibleRows.length;
  const totalCols = 4;

  if (e.key === 'ArrowUp') {
    e.preventDefault();
    if (window.App.activeRowIndex > 0) {
      window.App.activeRowIndex--;
      updateFocus();
    }
  } else if (e.key === 'ArrowDown') {
    e.preventDefault();
    if (window.App.activeRowIndex < totalVisibleRows - 1) {
      window.App.activeRowIndex++;
      updateFocus();
    }
  } else if (e.key === 'ArrowLeft') {
    e.preventDefault();
    if (e.altKey) {
      // Collapse
      const row = window.getActiveRowData();
      if (row && !row.collapsed) {
        row.collapsed = true;
        renderGrid();
      }
    } else if (activeColIndex > 0) {
      activeColIndex--;
      updateFocus();
    }
  } else if (e.key === 'ArrowRight') {
    e.preventDefault();
    if (e.altKey) {
      // Expand
      const row = window.getActiveRowData();
      if (row && row.collapsed) {
        row.collapsed = false;
        renderGrid();
      }
    } else if (activeColIndex < totalCols - 1) {
      activeColIndex++;
      updateFocus();
    }
  } else if (e.key === 'Tab') {
    e.preventDefault();
    if (e.shiftKey) {
      // Outdent
      if (window.App.db.items[window.App.activeRowIndex] && window.App.db.items[window.App.activeRowIndex].depth > 0) {
        window.App.db.items[window.App.activeRowIndex].depth--;
        renderGrid();
      }
    } else {
      // Indent
      if (window.App.db.items[window.App.activeRowIndex]) {
        window.App.db.items[window.App.activeRowIndex].depth++;
        renderGrid();
      }
    }
  } else if (e.key === 'Enter') {
    e.preventDefault();
    
    const visibleRows = getVisibleRows();
    const activeItem = visibleRows[window.App.activeRowIndex];
    
    let actualIndex = activeItem && !activeItem.isSectionHeader ? activeItem.index : window.App.db.items.length - 1;
    let activeDepth = activeItem && !activeItem.isSectionHeader ? activeItem.row.depth : 0;
    
    // Option A: Contextual Item Creation
    let explicitAssignments = [];
    for (let i = window.App.activeRowIndex; i >= 0; i--) {
      if (visibleRows[i] && visibleRows[i].isSectionHeader) {
        if (visibleRows[i].categoryId) {
          explicitAssignments.push(visibleRows[i].categoryId);
        }
        break;
      }
    }
    
    // Add item to database
    const newRow = window.App.db.addItem('', activeDepth, explicitAssignments);
    
    // If we are creating a root item in a sorted view, order doesn't matter much.
    // If it's a child item, we need to insert it right below the active item in the raw array.
    window.App.db.items.pop(); // Remove it from the very end
    if (activeItem && !activeItem.isSectionHeader && activeDepth > 0) {
      window.App.db.items.splice(actualIndex + 1, 0, newRow);
    } else {
      // Just append it
      window.App.db.items.push(newRow);
    }
    
    // To focus the newly created row, we re-render and then find its visible index
    renderGrid();
    
    const newVisibleRows = getVisibleRows();
    const newVisibleIdx = newVisibleRows.findIndex(r => !r.isSectionHeader && r.row.id === newRow.id);
    if (newVisibleIdx !== -1) {
      window.App.activeRowIndex = newVisibleIdx;
      activeColIndex = 0; // Focus the 'text' column
      updateFocus();
      
      // Auto-trigger edit mode
      if (typeof window.triggerGridEdit === 'function') {
        window.triggerGridEdit();
      }
    }
  } else if (e.key === 'Delete' || e.key === 'Backspace') {
    e.preventDefault();
    const visibleRows = getVisibleRows();
    const activeItem = visibleRows[window.App.activeRowIndex];
    if (activeItem && !activeItem.isSectionHeader) {
      window.App.db.softDeleteItem(activeItem.index);
      renderGrid();
      updateFocus();
    }
  } else if (e.key.toLowerCase() === 'r') {
    // Only allow restore if in Trash View
    const activeView = window.App.db.views.find(v => v.id === window.App.activeViewId);
    if (activeView && activeView.reserved && activeView.name === 'Trash View') {
      e.preventDefault();
      const visibleRows = getVisibleRows();
      const activeItem = visibleRows[window.App.activeRowIndex];
      if (activeItem && !activeItem.isSectionHeader) {
        if (activeItem.row.isCategoryPseudoItem) {
          window.App.db.restoreCategory(activeItem.index);
          if (typeof window.renderCategoryTree === 'function') window.renderCategoryTree();
        } else {
          window.App.db.restoreItem(activeItem.index);
        }
        renderGrid();
        updateFocus();
      }
    }
  }
});

// Initial render
renderGrid();
window.renderGrid = renderGrid;

// Make grid container focusable so we can capture keys
document.getElementById('grid-container').tabIndex = 0;
document.getElementById('grid-container').focus();

// Add double-click inline editing to column headers
document.querySelectorAll('.col-header').forEach(th => {
  th.addEventListener('dblclick', () => {
    // Prevent editing if already editing
    if (th.querySelector('input')) return;

    const currentText = th.textContent;
    th.innerHTML = ''; // Clear text

    const input = document.createElement('input');
    input.type = 'text';
    input.value = currentText;
    
    // Style the input to look like the header
    input.style.width = '100%';
    input.style.background = 'transparent';
    input.style.border = '1px solid var(--border-focus)';
    input.style.color = 'inherit';
    input.style.fontFamily = 'inherit';
    input.style.fontSize = 'inherit';
    input.style.fontWeight = 'inherit';
    input.style.padding = '2px';
    input.style.outline = 'none';

    const finishEditing = () => {
      const newText = input.value.trim() || currentText;
      th.innerHTML = '';
      th.textContent = newText;
    };

    input.addEventListener('blur', finishEditing);
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        input.blur();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        input.value = currentText; // Revert
        input.blur();
      }
    });

    th.appendChild(input);
    input.focus();
    input.select();
  });
});

