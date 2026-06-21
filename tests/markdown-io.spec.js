const { test, expect } = require('@playwright/test');
const { AgendaDatabase } = require('../database.js');
const { AgendaMarkdownParser } = require('../markdown-parser.js');

test.describe('Markdown STF Import/Export', () => {
  let db;

  test.beforeEach(() => {
    db = new AgendaDatabase();
  });

  test('should dynamically parse headings into categories', () => {
    const md = `
# Project Title
## Work
- [ ] Send email
### Important
- [x] Fix bug
  Note line 1
  Note line 2
## Home
- [ ] Buy groceries
    - [ ] Milk
    `;
    
    const success = AgendaMarkdownParser.parse(db, md);
    expect(success).toBe(true);

    // Root categories should be 'Work' and 'Home'
    const workCat = Object.values(db.categories).find(c => c.name === 'Work');
    const homeCat = Object.values(db.categories).find(c => c.name === 'Home');
    expect(workCat).toBeDefined();
    expect(workCat.parentId).toBeNull();
    expect(homeCat).toBeDefined();

    // 'Important' should be a child of 'Work'
    const impCat = Object.values(db.categories).find(c => c.name === 'Important');
    expect(impCat).toBeDefined();
    expect(impCat.parentId).toBe(workCat.id);

    // Items
    expect(db.items.length).toBe(4); // Send email, Fix bug, Buy groceries, Milk

    const fixBugItem = db.items.find(i => i.text === 'Fix bug');
    expect(fixBugItem).toBeDefined();
    expect(fixBugItem.assignments.has('done')).toBe(true);
    expect(fixBugItem.assignments.has(impCat.id)).toBe(true);
    expect(fixBugItem.notes && fixBugItem.notes.text).toBe('Note line 1\nNote line 2');
    expect(fixBugItem.depth).toBe(0);

    const groceriesItem = db.items.find(i => i.text === 'Buy groceries');
    expect(groceriesItem.assignments.has(homeCat.id)).toBe(true);

    const milkItem = db.items.find(i => i.text === 'Milk');
    // Milk should be depth 2 because it's indented 4 spaces (2 spaces per depth)
    expect(milkItem.depth).toBe(2);
  });

  test('should serialize to markdown', () => {
    // Setup
    const c1 = db.addCategory('cat-work', 'Work');
    const c2 = db.addCategory('cat-urgent', 'Urgent', 'cat-work');
    
    const i1 = db.addItem('Do laundry', 0, []);
    const i2 = db.addItem('Write report', 0, ['cat-urgent']);
    i2.notes = { text: "Need data from Bob" };
    const i3 = db.addItem('Draft email', 1, []);
    
    const md = AgendaMarkdownParser.serialize(db);

    expect(md).toContain('## Work');
    expect(md).toContain('### Urgent');
    expect(md).toContain('- [ ] Write report');
    expect(md).toContain('  Need data from Bob');
    expect(md).toContain('  - [ ] Draft email');
    expect(md).toContain('## Uncategorized Items');
    expect(md).toContain('- [ ] Do laundry');
  });
});
