const { _electron: electron } = require('playwright');
const { test, expect } = require('@playwright/test');

test.describe('Mouse Interactions', () => {
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

  test('Clicking a cell makes it the active cell', async () => {
    // Wait for the grid to render
    const firstRowAssigneeCell = window.locator('tr[data-index="0"] td').nth(1);
    
    // Click the second column of the first row
    await firstRowAssigneeCell.click();
    
    // It should have the active-cell class
    await expect(firstRowAssigneeCell).toHaveClass(/active-cell/);
  });

  test('Clicking the collapse icon collapses and expands a row', async () => {
    const iconSpan = window.locator('tr[data-index="0"] td span').first();
    await expect(iconSpan).toHaveText('▼');
    
    // Click the icon
    await iconSpan.click();
    
    // Icon should change to ▶
    await expect(iconSpan).toHaveText('▶');
    
    // The child row (index 1) should be hidden
    // The grid should now have 2 rows instead of 3
    await expect(window.locator('#grid-body tr')).toHaveCount(2);
    
    // Click it again to expand
    await iconSpan.click();
    await expect(iconSpan).toHaveText('▼');
    await expect(window.locator('#grid-body tr')).toHaveCount(3);
  });

  test('Clicking F-Key footer buttons triggers actions', async () => {
    const f5Button = window.locator('#fkey-toolbar button', { hasText: 'F5 Note' });
    await f5Button.click();
    
    // The note editor panel should appear
    const panel = window.locator('#properties-panel');
    await expect(panel).not.toHaveClass(/hidden/);
    await expect(window.locator('#panel-title')).toHaveText('Note Editor');
    
    // Press it again to close
    await f5Button.click();
    await expect(panel).toHaveClass(/hidden/);
  });
});
