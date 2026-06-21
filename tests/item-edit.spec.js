const { _electron: electron } = require('playwright');
const { test, expect } = require('@playwright/test');

test.describe('Item Creation and Inline Editing', () => {
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

  test('pressing Enter creates a new row and enters edit mode', async () => {
    // Initial number of rows should be 3
    let rows = window.locator('#grid-body tr');
    await expect(rows).toHaveCount(3);

    // Make sure we are focused on the grid container
    await window.locator('#grid-container').focus();

    // Press Enter to create a row
    await window.keyboard.press('Enter');

    // Number of rows should now be 4
    await expect(rows).toHaveCount(4);

    // The new row will be selected and active
    const activeCell = window.locator('td.active-cell');
    
    // It should automatically be in edit mode (have an input)
    const input = activeCell.locator('input');
    await expect(input).toBeVisible();

    // Type text and save
    await input.fill('New Action Item');
    await window.keyboard.press('Enter');

    // Re-verify the current row to ensure it rendered correctly after saving
    const inputField = activeCell.locator('input');
    await expect(inputField).toHaveCount(0);
    // Note: since it has no children, it will have a bullet • instead of ▼
    await expect(activeCell).toHaveText('• New Action Item');
  });

  test('pressing F2 enters edit mode for the active cell', async () => {
    await window.locator('#grid-container').focus();

    // Initial cell is "Finish project proposal"
    const activeCell = window.locator('td.active-cell');
    await expect(activeCell).toHaveText('▼ Finish project proposal');

    // Press F2
    await window.keyboard.press('F2');

    // Input should appear
    const input = activeCell.locator('input');
    await expect(input).toBeVisible();
    await expect(input).toHaveValue('Finish project proposal');

    // Type something new
    await input.fill('Updated task name');
    await window.keyboard.press('Enter');
    
    // Cell should update
    await expect(input).toHaveCount(0);
    await expect(activeCell).toHaveText('▼ Updated task name');
  });

  test('double-clicking a cell enters edit mode', async () => {
    await window.locator('#grid-container').focus();

    // Move to the Assignee cell on the second row
    await window.keyboard.press('ArrowDown');
    await window.keyboard.press('ArrowRight');

    const activeCell = window.locator('td.active-cell');
    await expect(activeCell).toHaveText('Mary');

    // Double-click it
    await activeCell.dblclick();

    // Input should appear
    const input = activeCell.locator('input');
    await expect(input).toBeVisible();
    await expect(input).toHaveValue('Mary');

    // Change the value
    await input.fill('Alice');
    await window.keyboard.press('Enter');

    // Verify it saved
    await expect(input).toHaveCount(0);
    await expect(activeCell).toHaveText('Alice');
  });
});
