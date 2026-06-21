const assert = require('assert');
const { AgendaDatabase } = require('../database.js');
const { parseDate, matchCategories, tokenize } = require('../matcher.js');

function runTests() {
  console.log("Running Heuristic Engine Tests...");
  
  const db = new AgendaDatabase();

  // Test 1: Basic Structure
  assert.ok(db.categories['root-who'], "Root Who category exists");
  assert.ok(db.categories['root-when'], "Root When category exists");
  
  // Add some test categories
  db.addCategory('who-mary', 'Mary', 'root-who', { synonyms: ['mary smith', 'mom'] });
  db.addCategory('who-john', 'John', 'root-who');
  
  // Test 2: Text Matching
  const item1 = db.addItem("Call Mary tomorrow");
  assert.ok(item1.assignments.has('who-mary'), "Item assigned to Mary");
  
  // Test 3: Parent Propagation
  assert.ok(item1.assignments.has('root-who'), "Item implicitly assigned to parent root-who");
  
  // Test 4: Synonym Matching
  const item2 = db.addItem("Send gift to mom");
  assert.ok(item2.assignments.has('who-mary'), "Item assigned to Mary via synonym 'mom'");
  
  // Test 5: Date Parsing
  // "tomorrow" should resolve to tomorrow's date
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tmrString = tomorrow.toISOString().split('T')[0];
  assert.ok(item1.assignments.has('date-' + tmrString), "Item assigned to tomorrow's date");
  assert.ok(item1.assignments.has('root-when'), "Item implicitly assigned to root-when");
  
  // Test 6: Exclusivity Enforcement
  const item3 = db.addItem("Fix the printer");
  // Manually assign to To Do
  db.assignCategory(item3, 'status-todo');
  assert.ok(item3.assignments.has('status-todo'));
  
  // Now assign to Done. Since root-status is exclusive, it should remove status-todo.
  db.assignCategory(item3, 'status-done');
  assert.ok(item3.assignments.has('status-done'), "Item assigned to Done");
  assert.ok(!item3.assignments.has('status-todo'), "Item unassigned from To Do because of exclusivity");

  console.log("All tests passed!");
}

runTests();
