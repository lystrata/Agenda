const { _electron: electron } = require('playwright');
const { test, expect } = require('@playwright/test');

test.describe('F7 View Filters Modal', () => {
  let electronApp;
  let window;

  test.beforeEach(async () => {
    electronApp = await electron.launch({ args: ['.'] });
    window = await electronApp.firstWindow();
    await window.waitForLoadState('domcontentloaded');
  });

  test.afterEach(async () => {
    await electronApp.close();
  });

  test('F7 opens the Filters modal', async () => {
    await window.locator('#grid-container').focus();

    // Press F7
    await window.keyboard.press('F7');

    // Modal should be visible
    const modal = window.locator('#filter-modal');
    await expect(modal).not.toHaveClass(/hidden/);

    // Focus should be in the text input
    await expect(window.locator('#filter-text')).toBeFocused();
  });

  test('Filtering by text updates the grid', async () => {
    await window.locator('#grid-container').focus();
    
    // Initial state: 3 rows
    await expect(window.locator('#grid-body tr')).toHaveCount(3);
    
    await window.keyboard.press('F7');
    
    // Type "budget" into the text filter
    await window.keyboard.type('budget');
    
    // Press Enter to apply
    await window.keyboard.press('Enter');
    
    // Modal should close
    await expect(window.locator('#filter-modal')).toHaveClass(/hidden/);
    
    // Grid should only show 1 row containing "budget"
    const rows = window.locator('#grid-body tr');
    await expect(rows).toHaveCount(1);
    await expect(rows.first()).toContainText('Review budget');
  });

  test('Filtering by assignee updates the grid', async () => {
    // First, let's set an assignee for the first row via F6
    await window.locator('#grid-container').focus();
    await window.keyboard.press('F6');
    await window.keyboard.press('Tab'); // Move to assignee
    await window.keyboard.type('Alice');
    await window.keyboard.press('Escape'); // Save and close F6
    
    // Now open F7
    await window.keyboard.press('F7');
    await window.keyboard.press('Tab'); // Move to assignee
    await window.keyboard.type('Alice');
    await window.keyboard.press('Enter'); // Apply
    
    // Grid should only show the first row and its children?
    // Wait, if the parent matches, does it show? Yes.
    // Actually, our getVisibleRows checks each row independently. 
    // If the child doesn't match, it will be hidden even if the parent matches!
    const rows = window.locator('#grid-body tr');
    await expect(rows).toHaveCount(1);
    await expect(rows.first()).toContainText('Finish project proposal');
  });
  
  test('Clearing filters restores the grid', async () => {
    await window.locator('#grid-container').focus();
    
    // Filter by text
    await window.keyboard.press('F7');
    await window.keyboard.type('client');
    await window.keyboard.press('Enter');
    
    await expect(window.locator('#grid-body tr')).toHaveCount(1);
    
    // Clear filter
    await window.keyboard.press('F7');
    await window.keyboard.press('Backspace'); // Delete 't'
    await window.keyboard.press('Backspace');
    await window.keyboard.press('Backspace');
    await window.keyboard.press('Backspace');
    await window.keyboard.press('Backspace');
    await window.keyboard.press('Backspace'); // Delete 'c'
    await window.keyboard.press('Enter');
    
    // Should be back to 3 rows
    await expect(window.locator('#grid-body tr')).toHaveCount(3);
  });
});
