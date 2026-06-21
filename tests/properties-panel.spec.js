const { _electron: electron } = require('playwright');
const { test, expect } = require('@playwright/test');

test.describe('F6 Object Properties Panel', () => {
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

  test('F6 opens the Properties Panel and populates inputs', async () => {
    await window.locator('#grid-container').focus();

    // Verify first row is active
    const activeCell = window.locator('td.active-cell');
    await expect(activeCell).toHaveText('▼ Finish project proposal');

    // Press F6
    await window.keyboard.press('F6');

    // Panel should be visible
    const propertiesPanel = window.locator('#properties-panel');
    await expect(propertiesPanel).not.toHaveClass(/hidden/);
    await expect(window.locator('#panel-title')).toHaveText('Object Properties (F6)');

    // Inputs should be populated
    await expect(window.locator('#prop-item-text')).toHaveValue('Finish project proposal');
    await expect(window.locator('#prop-assignee')).toHaveValue('John');
    await expect(window.locator('#prop-due')).toHaveValue('2026-06-20');
    
    // Focus should be in the panel (on the first textarea)
    await expect(window.locator('#prop-item-text')).toBeFocused();
  });

  test('Modifying properties and pressing Escape saves changes to grid', async () => {
    await window.locator('#grid-container').focus();
    await window.keyboard.press('F6');

    // Panel is open. Change values.
    await window.locator('#prop-item-text').fill('Updated project plan');
    await window.locator('#prop-assignee').fill('Samantha');
    await window.locator('#prop-due').fill('2026-07-01');

    // Press Escape
    await window.keyboard.press('Escape');

    // Panel should close
    const propertiesPanel = window.locator('#properties-panel');
    await expect(propertiesPanel).toHaveClass(/hidden/);

    // Focus should return to grid
    const gridContainer = window.locator('#grid-container');
    await expect(gridContainer).toBeFocused();

    // Grid row should reflect changes
    const activeRow = window.locator('tr[data-index="0"]');
    await expect(activeRow.locator('td').nth(0)).toHaveText('▼ Updated project plan');
    await expect(activeRow.locator('td').nth(1)).toHaveText('Samantha');
    await expect(activeRow.locator('td').nth(2)).toHaveText('2026-07-01');
  });
});
