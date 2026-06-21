import fs from 'fs';
import path from 'path';

// Mock AgendaDatabase
class MockDB {
  constructor() {
    this.categories = {};
    this.items = [];
  }
  addCategory(id, name, parentId = null) {
    if (!this.categories[id]) this.categories[id] = { id, name, parentId };
    return this.categories[id];
  }
  addItem(text, depth, assignments) {
    const item = { text, depth, assignments: Array.from(assignments), notes: {} };
    this.items.push(item);
    return item;
  }
}

// Emulate markdown-parser.js logic (simplified test)
const code = fs.readFileSync('./markdown-parser.js', 'utf8');
const script = `
  ${code}
  const db = new MockDB();
  const mdText = fs.readFileSync('./MD/TODO.md', 'utf8');
  AgendaMarkdownParser.parse(db, mdText);
  console.log('Categories parsed:', Object.keys(db.categories).length);
  console.log('Items parsed:', db.items.length);
  console.log('First 3 items:', db.items.slice(0, 3));
`;

try {
  eval(script);
} catch(e) {
  console.error("Error parsing:", e);
}
