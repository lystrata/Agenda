const { _electron: electron } = require('playwright');
const { test, expect } = require('@playwright/test');

test.describe('Hierarchical Grid Collapsing', () => {
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

  test('Grid renders visual indicators for children', async () => {
    await window.locator('#grid-container').focus();

    // First row has a child (depth 0, child is depth 1)
    const firstCell = window.locator('td.active-cell');
    await expect(firstCell).toHaveText('▼ Finish project proposal');
    
    // Second row has NO child
    await window.keyboard.press('ArrowDown');
    const secondCell = window.locator('td.active-cell');
    await expect(secondCell).toHaveText('• Review budget');
  });

  test('Alt+ArrowLeft collapses a row with children', async () => {
    await window.locator('#grid-container').focus();

    // The first row has a child (Review budget)
    let reviewBudgetRow = window.locator('#grid-body tr').filter({ hasText: '• Review budget' });
    await expect(reviewBudgetRow).toBeVisible();

    // Collapse first row
    await window.keyboard.press('Alt+ArrowLeft');

    // First row indicator changes to ▶
    const firstCell = window.locator('td.active-cell');
    await expect(firstCell).toHaveText('▶ Finish project proposal');

    // Child row is now hidden (removed from DOM via renderGrid)
    reviewBudgetRow = window.locator('#grid-body tr').filter({ hasText: '• Review budget' });
    await expect(reviewBudgetRow).toHaveCount(0);
    
    // ArrowDown skips to the next visible row
    await window.keyboard.press('ArrowDown');
    const nextActive = window.locator('td.active-cell');
    // Call client is depth 0, so it's visible
    await expect(nextActive).toHaveText('• Call client');
  });

  test('Alt+ArrowRight expands a collapsed row', async () => {
    await window.locator('#grid-container').focus();

    // Collapse first row
    await window.keyboard.press('Alt+ArrowLeft');
    
    // Verify hidden
    let reviewBudgetRow = window.locator('#grid-body tr').filter({ hasText: '• Review budget' });
    await expect(reviewBudgetRow).toHaveCount(0);

    // Expand first row
    await window.keyboard.press('Alt+ArrowRight');

    // Indicator reverts
    const firstCell = window.locator('td.active-cell');
    await expect(firstCell).toHaveText('▼ Finish project proposal');

    // Child row returns
    reviewBudgetRow = window.locator('#grid-body tr').filter({ hasText: '• Review budget' });
    await expect(reviewBudgetRow).toBeVisible();
    
    // ArrowDown navigates into child
    await window.keyboard.press('ArrowDown');
    const activeChild = window.locator('td.active-cell');
    await expect(activeChild).toHaveText('• Review budget');
  });
});
