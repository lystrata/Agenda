const { test, expect } = require('@playwright/test');
const { AgendaDatabase } = require('../database.js');

test.describe('File System Persistence (Serialization)', () => {
  let db;

  test.beforeEach(() => {
    db = new AgendaDatabase();
  });

  test('should serialize and deserialize preserving Sets and object structure', () => {
    // 1. Setup a complex database state
    db.addCategory('cat-project', 'Project X', null);
    
    // Add an item and assign it categories
    const item1 = db.addItem('Work on Project X', 0, ['cat-project']);
    const item2 = db.addItem('Meeting at 5pm', 0, []);
    
    // Assign additional category manually
    db.assignCategory(item2, 'root-who');
    
    // 2. Serialize
    const jsonString = db.serialize();
    
    // Validate JSON structure
    const parsed = JSON.parse(jsonString);
    expect(parsed.categories).toBeDefined();
    expect(parsed.items).toBeDefined();
    expect(parsed.views).toBeDefined();
    
    // Ensure sets were serialized to arrays
    const parsedItem1 = parsed.items.find(i => i.id === item1.id);
    expect(Array.isArray(parsedItem1.assignments)).toBe(true);
    expect(parsedItem1.assignments).toContain('cat-project');
    
    // 3. Deserialize into a fresh database instance
    const newDb = new AgendaDatabase();
    const success = newDb.deserialize(jsonString);
    expect(success).toBe(true);
    
    // 4. Verify reconstruction
    expect(newDb.items.length).toBe(db.items.length);
    
    const reconstructedItem1 = newDb.items.find(i => i.id === item1.id);
    // Verify it's a Set again
    expect(reconstructedItem1.assignments instanceof Set).toBe(true);
    expect(reconstructedItem1.assignments.has('cat-project')).toBe(true);
    
    const reconstructedItem2 = newDb.items.find(i => i.id === item2.id);
    expect(reconstructedItem2.assignments.has('root-who')).toBe(true);
  });

  test('should handle invalid JSON during deserialization gracefully', () => {
    const success = db.deserialize("INVALID_JSON{]");
    expect(success).toBe(false);
  });
});
