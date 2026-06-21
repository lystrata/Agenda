// Agenda Database Engine

// In the browser, matcher functions might be attached to window, or we can use modules.
// For now, we'll assume matcher functions are available globally if in browser, or required if in Node.
let matcher;
if (typeof require !== 'undefined' && typeof module !== 'undefined') {
  matcher = require('./matcher.js');
} else {
  matcher = { parseDate: window.parseDate, matchCategories: window.matchCategories };
}

class AgendaDatabase {
  constructor() {
    this.categories = {}; // id -> Category object
    this.items = [];      // array of Item objects
    this.views = [];
    
    // Create root categories
    this.addCategory('root-when', 'When', null, { indexed: false, exclusive: true });
    this.addCategory('root-who', 'Who', null, { indexed: false, exclusive: true });
    this.addCategory('root-status', 'Status', null, { indexed: false, exclusive: true });
    
    // Add default status children
    this.addCategory('status-todo', 'To Do', 'root-status');
    this.addCategory('status-done', 'Done', 'root-status');
    
    // Create Default Views
    this.addView('Main View', null); // Flat list
    this.addView('By Status', 'root-status');
    this.addView('By Assignee', 'root-who');
    
    // Add reserved Trash View
    this.addView('Trash View', null, true);
  }

  addView(name, sectionCategoryId = null, reserved = false, layout = 'outliner', columnCategoryId = null) {
    const view = {
      id: reserved ? 'view-trash' : Date.now().toString() + Math.random().toString(36).substring(2, 5),
      name,
      sectionCategoryId, // Y-Axis (Rows)
      columnCategoryId,  // X-Axis (Columns) - only used if layout === 'matrix'
      layout,            // 'outliner' or 'matrix'
      reserved
    };
    this.views.push(view);
    return view;
  }

  addCategory(id, name, parentId = null, options = {}) {
    const cat = {
      id,
      name,
      parentId,
      synonyms: options.synonyms || [],
      exclusive: options.exclusive !== undefined ? options.exclusive : false,
      indexed: options.indexed !== undefined ? options.indexed : true,
      deleted: false
    };
    this.categories[id] = cat;
    return cat;
  }

  getAncestors(catId) {
    const ancestors = [];
    let current = this.categories[catId];
    while (current && current.parentId) {
      ancestors.push(current.parentId);
      current = this.categories[current.parentId];
    }
    return ancestors;
  }

  getDescendants(catId) {
    const descendants = [];
    for (const id in this.categories) {
      const cat = this.categories[id];
      if (cat.parentId === catId) {
        descendants.push(id);
        descendants.push(...this.getDescendants(id));
      }
    }
    return descendants;
  }

  getSiblings(catId) {
    const cat = this.categories[catId];
    if (!cat || !cat.parentId) return [];
    return Object.values(this.categories)
      .filter(c => c.parentId === cat.parentId && c.id !== catId)
      .map(c => c.id);
  }

  addItem(text, depth = 0, explicitAssignments = []) {
    const item = {
      id: Date.now().toString() + Math.random().toString(36).substring(2, 5),
      text,
      notes: {},
      depth,
      collapsed: false,
      assignments: new Set(explicitAssignments), // Set of category IDs
      entryDate: new Date().toISOString().split('T')[0],
      deleted: false
    };
    
    this.items.push(item);
    this.processItem(item);
    return item;
  }

  updateCategory(id, updates) {
    const cat = this.categories[id];
    if (!cat) return;
    
    if (updates.name !== undefined) cat.name = updates.name;
    if (updates.parentId !== undefined) {
      if (updates.parentId === null) {
        cat.parentId = null;
      } else if (this.categories[updates.parentId] && updates.parentId !== id) {
        cat.parentId = updates.parentId;
      }
    }
    if (updates.exclusive !== undefined) cat.exclusive = updates.exclusive;
  }

  updateItem(id, updates) {
    const item = this.items.find(i => i.id === id);
    if (!item) return;
    
    if (updates.text !== undefined) item.text = updates.text;
    if (updates.notes !== undefined) {
      item.notes = { ...item.notes, ...updates.notes };
    }
    if (updates.collapsed !== undefined) item.collapsed = updates.collapsed;
    if (updates.depth !== undefined) item.depth = updates.depth;
    
    // If text was updated, we should re-process to find new matching categories
    if (updates.text !== undefined) {
      this.processItem(item);
    }
  }

  softDeleteCategory(catId) {
    if (!this.categories[catId]) return;
    this.categories[catId].deleted = true;
    const descendants = this.getDescendants(catId);
    descendants.forEach(dId => {
      if (this.categories[dId]) this.categories[dId].deleted = true;
    });
  }

  restoreCategory(catId) {
    if (!this.categories[catId]) return;
    this.categories[catId].deleted = false;
    // Note: restoring a category might require restoring its parent to be visible in tree, 
    // but for now we just unmark it.
    let currentId = this.categories[catId].parentId;
    while (currentId && this.categories[currentId]) {
      this.categories[currentId].deleted = false;
      currentId = this.categories[currentId].parentId;
    }
  }

  mergeCategory(sourceId, targetId) {
    if (!this.categories[sourceId] || !this.categories[targetId]) return false;
    if (sourceId === targetId) return false;

    // 1. Move all child categories of source to target
    for (const catId in this.categories) {
      if (this.categories[catId].parentId === sourceId) {
        this.categories[catId].parentId = targetId;
      }
    }

    // 2. Move all item assignments from source to target
    for (const item of this.items) {
      if (item.assignments.has(sourceId)) {
        item.assignments.delete(sourceId);
        item.assignments.add(targetId);
      }
    }

    // 3. Mark the source category as deleted
    this.softDeleteCategory(sourceId);
    return true;
  }

  softDeleteItem(itemIndex) {
    if (this.items[itemIndex]) {
      this.items[itemIndex].deleted = true;
      // Also delete its children? In Agenda, deleting a parent deletes children.
      const parentDepth = this.items[itemIndex].depth;
      let j = itemIndex + 1;
      while (j < this.items.length && this.items[j].depth > parentDepth) {
        this.items[j].deleted = true;
        j++;
      }
    }
  }

  restoreItem(itemIndex) {
    if (this.items[itemIndex]) {
      this.items[itemIndex].deleted = false;
    }
  }

  emptyTrash() {
    // Permanent deletion of items
    this.items = this.items.filter(i => !i.deleted);
    // Permanent deletion of categories
    for (const id in this.categories) {
      if (this.categories[id].deleted) {
        delete this.categories[id];
      }
    }
  }

  assignCategory(item, catId) {
    if (!this.categories[catId]) return;
    
    item.assignments.add(catId);
    
    // 1. Parent Propagation
    const ancestors = this.getAncestors(catId);
    for (const pId of ancestors) {
      item.assignments.add(pId);
    }
    
    // 2. Exclusivity Enforcement
    // Check if any ancestor is exclusive. If so, remove assignments to its other children.
    const path = [catId, ...ancestors];
    for (let i = 0; i < path.length; i++) {
      const currentId = path[i];
      const parentId = this.categories[currentId].parentId;
      if (parentId && this.categories[parentId].exclusive) {
        // Parent is exclusive! We must remove assignments to all siblings of currentId
        const siblings = this.getSiblings(currentId);
        for (const sibId of siblings) {
          // Remove sibling and all its descendants
          if (item.assignments.has(sibId)) {
            item.assignments.delete(sibId);
            const desc = this.getDescendants(sibId);
            desc.forEach(d => item.assignments.delete(d));
          }
        }
      }
    }
  }

  processItem(item) {
    // 1. Date Parsing
    const parsedDate = matcher.parseDate(item.text);
    if (parsedDate) {
      // Find or create category under 'root-when'
      let dateCatId = 'date-' + parsedDate;
      if (!this.categories[dateCatId]) {
        this.addCategory(dateCatId, parsedDate, 'root-when', { indexed: false });
      }
      this.assignCategory(item, dateCatId);
    }

    // 2. Text Matching
    const matchedIds = matcher.matchCategories(item.text, this.categories);
    for (const catId of matchedIds) {
      this.assignCategory(item, catId);
    }
    
    // Note: We deliberately do NOT remove manually assigned categories that no longer match the text.
    // This allows the user to manually categorize an item even if the text doesn't contain the word.
  }

  // Helper for UI
  getCategoryAssignmentName(item, parentCatId) {
    // Returns the name of the child category under parentCatId that this item is assigned to
    const descendants = this.getDescendants(parentCatId);
    for (const dId of descendants) {
      // Only return direct children or leaf nodes usually, but for simplicity we return the first match
      if (item.assignments.has(dId) && this.categories[dId].parentId === parentCatId) {
        return this.categories[dId].name;
      }
    }
    return '';
  }

  groupItemsBySection(visibleRows, sectionCatId, collapsedSectionsSet = new Set()) {
    if (!sectionCatId) return visibleRows;
    
    // Get ALL direct children of the section category
    const sectionChildren = Object.values(this.categories)
      .filter(c => c.parentId === sectionCatId && !c.deleted)
      .sort((a, b) => a.name.localeCompare(b.name));
      
    // If a category is marked as 'exclusive', it's intended as a grouping root (like 'Who', 'Status'), 
    // so it should never behave as a filtering leaf, even if it has no children yet.
    const isLeafCategory = sectionChildren.length === 0 && !this.categories[sectionCatId].exclusive;
    
    const groups = {}; 
    const unassigned = [];
    
    for (let i = 0; i < visibleRows.length; i++) {
      const itemRow = visibleRows[i];
      if (itemRow.row.depth === 0) {
        let targetGroup = unassigned;
        let assignmentName = null;
        
        if (isLeafCategory) {
           // If the section is a leaf (no children), we group by the section category itself
           if (itemRow.row.assignments.has(sectionCatId)) {
             assignmentName = this.categories[sectionCatId].name;
           }
        } else {
           // Otherwise we group by the children of the section category
           assignmentName = this.getCategoryAssignmentName(itemRow.row, sectionCatId);
        }
        
        if (assignmentName) {
           if (!groups[assignmentName]) groups[assignmentName] = [];
           targetGroup = groups[assignmentName];
        }
        targetGroup.push(itemRow);
        
        // Push all descendants into the same group
        let j = i + 1;
        while (j < visibleRows.length && visibleRows[j].row.depth > 0) {
          targetGroup.push(visibleRows[j]);
          j++;
        }
        i = j - 1; 
      }
    }
    
    const groupedVisibleRows = [];
    
    // If it's a leaf category, we only create one section for the category itself.
    if (isLeafCategory) {
      const catName = this.categories[sectionCatId].name;
      if (groups[catName]) {
        const isCollapsed = collapsedSectionsSet.has(sectionCatId);
        groupedVisibleRows.push({
          isSectionHeader: true,
          title: catName,
          categoryId: sectionCatId,
          sectionId: sectionCatId,
          collapsed: isCollapsed
        });
        if (!isCollapsed) {
          groupedVisibleRows.push(...groups[catName]);
        }
      }
      // For leaf category views, we DO NOT show an (UNASSIGNED) bucket of the whole database.
      return groupedVisibleRows;
    }
    
    // For non-leaf categories (like 'Who', 'When')
    for (const childCat of sectionChildren) {
      const groupName = childCat.name;
      const catId = childCat.id;
      const sectionId = catId;
      const isCollapsed = collapsedSectionsSet.has(sectionId);
      
      groupedVisibleRows.push({
        isSectionHeader: true,
        name: groupName,
        categoryId: catId,
        sectionId: sectionId,
        collapsed: isCollapsed
      });
      
      if (!isCollapsed && groups[groupName]) {
        groupedVisibleRows.push(...groups[groupName]);
      }
      delete groups[groupName];
    }
    
    for (const remainingGroup in groups) {
      unassigned.push(...groups[remainingGroup]);
    }
    
    if (unassigned.length > 0) {
      const sectionId = 'unassigned';
      // Default to collapsing the (UNASSIGNED) section to reduce noise, unless explicitly expanded (by removing from set? No, let's just use the set normally, but default it to not dominate)
      const isCollapsed = collapsedSectionsSet.has(sectionId);
      
      groupedVisibleRows.push({
        isSectionHeader: true,
        name: '(Unassigned)',
        categoryId: null,
        sectionId: sectionId,
        collapsed: isCollapsed
      });
      
      if (!isCollapsed) {
        groupedVisibleRows.push(...unassigned);
      }
    }
    
    return groupedVisibleRows;
  }

  serialize() {
    // We need to convert the Sets in items.assignments into Arrays for JSON serialization
    const data = {
      categories: this.categories,
      views: this.views,
      items: this.items.map(item => ({
        ...item,
        assignments: Array.from(item.assignments)
      }))
    };
    return JSON.stringify(data, null, 2);
  }

  deserialize(jsonString) {
    try {
      const data = JSON.parse(jsonString);
      if (data.categories) this.categories = data.categories;
      if (data.views) this.views = data.views;
      
      if (data.items) {
        this.items = data.items.map(item => ({
          ...item,
          assignments: new Set(item.assignments || [])
        }));
      }
      return true;
    } catch (e) {
      console.error("Failed to deserialize database", e);
      return false;
    }
  }
}

if (typeof module !== 'undefined') {
  module.exports = { AgendaDatabase };
}
