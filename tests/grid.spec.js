const { _electron: electron } = require('playwright');
const { test, expect } = require('@playwright/test');

test.describe('Hierarchical Grid Navigation', () => {
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

  test('Grid is populated and first cell is active', async () => {
    // The first cell should be selected by default
    const activeCell = window.locator('td.active-cell');
    await expect(activeCell).toHaveCount(1);
    await expect(activeCell).toHaveText('▼ Finish project proposal');
  });

  test('Arrow keys navigate the grid', async () => {
    await window.locator('#grid-container').focus();

    // Initial active cell is at (0, 0)
    let activeCell = window.locator('td.active-cell');
    await expect(activeCell).toHaveText('▼ Finish project proposal');

    // Move right to Assignee
    await window.keyboard.press('ArrowRight');
    activeCell = window.locator('td.active-cell');
    await expect(activeCell).toHaveText('John');

    // Move down to second row Assignee
    await window.keyboard.press('ArrowDown');
    activeCell = window.locator('td.active-cell');
    await expect(activeCell).toHaveText('Mary');

    // Move left back to Item text
    await window.keyboard.press('ArrowLeft');
    activeCell = window.locator('td.active-cell');
    await expect(activeCell).toHaveText('• Review budget');
  });

  test('Tab indents the row', async () => {
    await window.locator('#grid-container').focus();
    
    // Select second row, first cell
    await window.keyboard.press('ArrowDown');
    await expect(window.locator('td.active-cell')).toHaveText('• Review budget');
    
    // Indent
    await window.keyboard.press('Tab');
    
    // In grid.js, style.paddingLeft is updated based on depth. 
    // Depth 2 = 10 + (2*20) = 50px
    const secondRowFirstCell = window.locator('tr[data-index="1"] td').first();
    await expect(secondRowFirstCell).toHaveCSS('padding-left', '50px');
  });

  test('Shift+Tab outdents the row', async () => {
    const secondRowFirstCell = window.locator('tr[data-index="1"] td').first();
    
    // Move down to second row (which starts at depth 1 -> padding 30px)
    await window.keyboard.press('ArrowDown');
    await expect(secondRowFirstCell).toHaveCSS('padding-left', '30px');
    
    // Outdent
    await window.keyboard.press('Shift+Tab');
    
    // Depth 0 = 10px
    await expect(secondRowFirstCell).toHaveCSS('padding-left', '10px');
  });
});
