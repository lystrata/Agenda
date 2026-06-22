/**
 * AgendaMarkdownParser - Ingests and exports structured markdown files.
 * Uses Markdown Headers (##, ###) to dynamically create Category Hierarchies.
 * Uses Markdown lists (- [ ]) to create Items and establish depth.
 */
class AgendaMarkdownParser {
  /**
   * Parses markdown text and loads categories, items, and structures into AgendaDatabase.
   * @param {AgendaDatabase} db 
   * @param {string} markdownText 
   */
  static parse(db, markdownText) {
    if (!markdownText) return false;

    const lines = markdownText.split(/\r?\n/);
    
    // Tracks the current category ID for each header level (1 to 6)
    const activeCategoryStack = Array(7).fill(null);
    let currentHeaderCatId = null;

    // Buffer for the current item to attach notes
    let currentItemData = null;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmed = line.trim();

      // 1. Detect Headers (## Category, ### SubCategory)
      const hMatch = line.match(/^(#{2,6})\s+(.*)$/);
      if (hMatch) {
        this._flushCurrentItem(db, currentItemData);
        currentItemData = null;

        const level = hMatch[1].length; // 2 to 6
        const name = hMatch[2].trim();
        let catId = 'cat-' + name.toLowerCase().replace(/[^a-z0-9]/g, '-');
        
        // Map reserved root categories to their built-in IDs
        const normalizedName = name.trim().toLowerCase();
        if (normalizedName === 'who') catId = 'root-who';
        else if (normalizedName === 'when') catId = 'root-when';
        else if (normalizedName === 'status') catId = 'root-status';
        
        // Find the nearest parent in the stack
        let parentId = null;
        for (let j = level - 1; j >= 2; j--) {
          if (activeCategoryStack[j]) {
            parentId = activeCategoryStack[j];
            break;
          }
        }

        if (!db.categories[catId]) {
          db.addCategory(catId, name, parentId);
        }
        
        activeCategoryStack[level] = catId;
        // clear deeper levels
        for (let j = level + 1; j <= 6; j++) activeCategoryStack[j] = null;
        
        currentHeaderCatId = catId;
        continue;
      }

      // 2. Detect Task Checklist Lines (e.g. "- [ ]" or "- [x]")
      const taskMatch = line.match(/^(\s*)-\s+\[(x|\s|X)\]\s+(.*)$/);
      if (taskMatch) {
        this._flushCurrentItem(db, currentItemData);

        const indentSpaces = taskMatch[1].length;
        const isCompleted = taskMatch[2].toLowerCase() === 'x';
        const rawContent = taskMatch[3];

        // Extract bracket tags [tag]
        const tagRegex = /\[([^\]]+)\]/g;
        let match;
        const tags = [];
        while ((match = tagRegex.exec(rawContent)) !== null) {
          tags.push(match[1].trim());
        }

        // Clean task text of tag brackets
        const cleanText = rawContent.replace(/\[[^\]]+\]/g, '').trim();

        // Assuming 2 spaces per indentation level
        const depth = Math.floor(indentSpaces / 2);

        currentItemData = {
          text: cleanText,
          depth: depth,
          isCompleted: isCompleted,
          tags: tags,
          headerCatId: currentHeaderCatId,
          noteLines: []
        };
        continue;
      }

      // 3. Gather Indented Lines as Notes for the active task
      if (currentItemData) {
        // Only append non-empty lines or if we already have some notes
        if (trimmed !== '' || currentItemData.noteLines.length > 0) {
          currentItemData.noteLines.push(trimmed);
        }
      }
    }

    // Flush the final item
    this._flushCurrentItem(db, currentItemData);

    return true;
  }

  /**
   * Helper to flush buffered parsing data to the database
   * @private
   */
  static _flushCurrentItem(db, itemData) {
    if (!itemData) return;

    // Trim empty trailing note lines
    while (itemData.noteLines.length > 0 && itemData.noteLines[itemData.noteLines.length - 1] === '') {
      itemData.noteLines.pop();
    }

    const assignments = [];
    if (itemData.isCompleted) assignments.push('done'); // Will auto-map to status-done in logic maybe, or we can use 'status-done'. Wait! The engine uses 'status-done'.
    // Let's change 'done' to 'status-done'
    if (itemData.isCompleted) assignments.push('status-done');
    else assignments.push('status-todo');

    if (itemData.headerCatId) assignments.push(itemData.headerCatId);

    // Ensure tags exist as categories (using 'cat-' prefix to unify with headers)
    for (const tag of itemData.tags) {
      let tagId = 'cat-' + tag.toLowerCase().replace(/[^a-z0-9]/g, '-');
      const normalizedTag = tag.trim().toLowerCase();
      if (normalizedTag === 'who') tagId = 'root-who';
      else if (normalizedTag === 'when') tagId = 'root-when';
      else if (normalizedTag === 'status') tagId = 'root-status';

      if (!db.categories[tagId]) {
        db.addCategory(tagId, tag, null); // Add tags as root categories if they don't exist
      }
      assignments.push(tagId);
    }
    
    // Extract Owner (Who)
    const fullText = (itemData.text + '\n' + itemData.noteLines.join('\n'));
    const ownerMatch = fullText.match(/\bowner:\s*\**([a-zA-Z0-9\s\-]+)\**/i) || 
                       fullText.match(/\bassigned\s+to\s+([a-zA-Z0-9\s\-]+)\b/i);
    if (ownerMatch) {
      const ownerName = ownerMatch[1].trim();
      const displayName = ownerName.replace(/\b\w/g, c => c.toUpperCase());
      const ownerId = 'cat-' + ownerName.toLowerCase().replace(/[^a-z0-9]/g, '-');
      if (!db.categories[ownerId]) {
        db.addCategory(ownerId, displayName, 'root-who');
      }
      assignments.push(ownerId);
    }
    
    // Extract Dates (When) - look for YYYY-MM-DD
    const dateMatch = fullText.match(/\b(20\d{2}-\d{2}-\d{2})\b/);
    if (dateMatch) {
      const dateStr = dateMatch[1];
      const dateId = 'cat-' + dateStr;
      if (!db.categories[dateId]) {
        db.addCategory(dateId, dateStr, 'root-when');
      }
      assignments.push(dateId);
    }

    const item = db.addItem(itemData.text, itemData.depth, assignments);
    if (itemData.noteLines.length > 0) {
      if (!item.notes) item.notes = {};
      item.notes.text = itemData.noteLines.join('\n');
    }
  }

  /**
   * Serializes the database back to structured Markdown.
   * @param {AgendaDatabase} db
   * @returns {string}
   */
  static serialize(db) {
    const lines = [];
    lines.push('# Lotus Agenda Export');
    lines.push(`_Exported on ${new Date().toISOString()}_`);
    lines.push('');

    // To prevent infinite loops or processing items multiple times, we need a strategy.
    // For markdown, we'll iterate through root categories, then their children, etc.
    // We will place items under the deepest category they are assigned to.
    
    const processedItems = new Set();

    // Helper to get category depth (H2, H3, etc.)
    const getCategoryDepth = (catId) => {
      let depth = 2; // Root is H2
      let current = db.categories[catId];
      while (current && current.parentId) {
        depth++;
        current = db.categories[current.parentId];
      }
      return depth;
    };

    // Helper to recursively write categories and their items
    const writeCategory = (catId) => {
      const cat = db.categories[catId];
      if (!cat || cat.deleted) return;
      
      const depth = getCategoryDepth(catId);
      // Cap at H6
      const hLevel = Math.min(depth, 6);
      lines.push(`${'#'.repeat(hLevel)} ${cat.name}`);
      lines.push('');

      // Find items that belong exclusively to this category (or its ancestors, but this is the deepest)
      // Actually, an item could belong to multiple categories. We'll output it under the FIRST matched category hierarchy to avoid duplication.
      const itemsInCat = db.items.filter(item => 
        item.assignments.has(catId) && !processedItems.has(item.id)
      );

      // Only process root items here. Child items will be processed recursively.
      const rootItems = itemsInCat.filter(i => i.depth === 0);
      
      for (const item of rootItems) {
        AgendaMarkdownParser._serializeItemAndDescendants(item, db, 0, lines, processedItems, catId);
      }

      lines.push('');

      // Recurse to children
      const children = Object.values(db.categories)
        .filter(c => c.parentId === catId)
        .sort((a, b) => a.name.localeCompare(b.name));
      
      for (const child of children) {
        writeCategory(child.id);
      }
    };

    // 1. Process all explicitly created categories starting from roots
    const rootCats = Object.values(db.categories)
      .filter(c => !c.parentId)
      .sort((a, b) => a.name.localeCompare(b.name));
    
    for (const rootCat of rootCats) {
      writeCategory(rootCat.id);
    }

    // 2. Catch any items that didn't get grouped under a category (orphans)
    const orphans = db.items.filter(item => !processedItems.has(item.id) && item.depth === 0);
    if (orphans.length > 0) {
      lines.push('## Uncategorized Items');
      lines.push('');
      for (const item of orphans) {
        AgendaMarkdownParser._serializeItemAndDescendants(item, db, 0, lines, processedItems, null);
      }
    }

    return lines.join('\n');
  }

  /**
   * Recursively serializes an item and its child tasks.
   * @private
   */
  static _serializeItemAndDescendants(item, db, indentDepth, lines, processedItems, groupedCatId = null) {
    if (processedItems.has(item.id) || item.deleted) return;
    processedItems.add(item.id);

    const indent = '  '.repeat(indentDepth);
    const isCompleted = item.assignments.has('done') || item.assignments.has('status-done');
    const checkbox = isCompleted ? '[x]' : '[ ]';

    // Collect tags (categories that we are NOT already grouped under)
    const tagStrings = [];
    for (const catId of item.assignments) {
      if (catId === 'done' || catId === 'status-done' || catId === 'status-todo') continue; // Handled by checkbox
      
      const cat = db.categories[catId];
      if (!cat) continue;
      
      // Do not append the tag if it's the exact category we are rendering this item under
      if (groupedCatId === catId) continue;
      
      // Also, we can optionally skip ancestors of the groupedCatId, but it's safer to just skip the exact match
      tagStrings.push(`[${cat.name}]`);
    }

    const tagsSuffix = tagStrings.length > 0 ? ` ${tagStrings.join(' ')}` : '';
    lines.push(`${indent}- ${checkbox} ${item.text}${tagsSuffix}`);

    // Note (if any)
    const primaryNote = item.notes && item.notes.text ? item.notes.text : null;
    if (primaryNote) {
      const noteIndent = '  '.repeat(indentDepth + 1);
      // Split into lines to prefix
      const noteLines = primaryNote.split(/\r?\n/);
      for (const noteLine of noteLines) {
        lines.push(`${noteIndent}${noteLine}`);
      }
    }

    // Find children. Since our database relies on flat array order for depth,
    // children are all items immediately following this item with depth > item.depth,
    // up until we hit an item with depth <= item.depth.
    const itemIndex = db.items.findIndex(i => i.id === item.id);
    if (itemIndex !== -1) {
      for (let i = itemIndex + 1; i < db.items.length; i++) {
        const potentialChild = db.items[i];
        if (potentialChild.depth <= item.depth) break;
        if (potentialChild.depth === item.depth + 1) {
          AgendaMarkdownParser._serializeItemAndDescendants(potentialChild, db, indentDepth + 1, lines, processedItems);
        }
      }
    }
  }

  /**
   * Renders raw markdown text into full HTML with block elements.
   * Supports Headings, Lists, Blockquotes, Bold, and Italic.
   * @param {string} text 
   * @returns {string} HTML
   */
  static renderToHtml(text) {
    if (!text) return '';
    
    let lines = text.split(/\r?\n/);
    let html = '';
    let inList = false;
    
    // Helper to parse inline styles (bold, italic)
    const parseInline = (line) => {
      let l = line.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
      l = l.replace(/\*\*([^\*]+)\*\*/g, '<b>$1</b>').replace(/__([^_]+)__/g, '<b>$1</b>');
      l = l.replace(/\*([^\*]+)\*/g, '<i>$1</i>').replace(/_([^_]+)_/g, '<i>$1</i>');
      return l;
    };

    for (let i = 0; i < lines.length; i++) {
      let line = lines[i].trim();
      
      // Close list if line is empty or not a list item
      const isListItem = line.match(/^[\-\*]\s+(.*)/);
      if (inList && (!isListItem)) {
        html += '</ul>\n';
        inList = false;
      }
      
      if (!line) {
        // Blank line -> skip or add <br> if we want, but typically paragraphs handle spacing
        continue;
      }
      
      // Headings
      let hMatch = line.match(/^(#{1,6})\s+(.*)/);
      if (hMatch) {
        const level = hMatch[1].length;
        html += `<h${level}>${parseInline(hMatch[2])}</h${level}>\n`;
        continue;
      }
      
      // Blockquotes
      let bqMatch = line.match(/^>\s+(.*)/);
      if (bqMatch) {
        html += `<blockquote>${parseInline(bqMatch[1])}</blockquote>\n`;
        continue;
      }
      
      // Lists
      if (isListItem) {
        if (!inList) {
          html += '<ul>\n';
          inList = true;
        }
        html += `<li>${parseInline(isListItem[1])}</li>\n`;
        continue;
      }
      
      // Paragraph
      html += `<p>${parseInline(line)}</p>\n`;
    }
    
    if (inList) html += '</ul>\n';
    
    return html;
  }
}

// Export for Node.js environments (like Playwright tests)
if (typeof module !== 'undefined') {
  module.exports = { AgendaMarkdownParser };
}

if (typeof window !== 'undefined') {
  window.AgendaMarkdownParser = AgendaMarkdownParser;
}
