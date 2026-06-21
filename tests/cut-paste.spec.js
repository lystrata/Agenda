const { _electron: electron } = require('playwright');
const { test, expect } = require('@playwright/test');

test.describe('F3/F4 Cut and Paste', () => {
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

  test('F3 cuts a row and its children, F4 pastes them below the active row', async () => {
    await window.locator('#grid-container').focus();

    // Verify initial state
    // Row 0: ▼ Finish project proposal
    // Row 1: • Review budget (child of row 0)
    // Row 2: • Call client
    const gridRows = window.locator('#grid-body tr');
    await expect(gridRows).toHaveCount(3);
    
    const row0Cell = window.locator('tr[data-index="0"] td').first();
    await expect(row0Cell).toHaveText('▼ Finish project proposal');
    
    const row1Cell = window.locator('tr[data-index="1"] td').first();
    await expect(row1Cell).toHaveText('• Review budget');

    // Press F3 on the first row (Finish project proposal)
    await window.keyboard.press('F3');

    // Row 0 and Row 1 should be cut. Only "Call client" remains.
    await expect(gridRows).toHaveCount(1);
    const newRow0Cell = window.locator('tr[data-index="0"] td').first();
    await expect(newRow0Cell).toHaveText('• Call client');

    // Now press F4 to paste. It should paste BELOW the active row.
    // Active row is now index 0 ("Call client").
    // Paste will insert at index 1.
    await window.keyboard.press('F4');

    // Grid should have 3 rows again
    await expect(gridRows).toHaveCount(3);

    // Row 0 is Call client
    await expect(window.locator('tr[data-index="0"] td').first()).toHaveText('• Call client');
    
    // Row 1 is Finish project proposal (which was cut, now pasted)
    await expect(window.locator('tr[data-index="1"] td').first()).toHaveText('▼ Finish project proposal');
    
    // Row 2 is Review budget (the child that came along)
    await expect(window.locator('tr[data-index="2"] td').first()).toHaveText('• Review budget');

    // The depth of the pasted parent should match the row it was pasted below
    // "Call client" is depth 0. The pasted block's root was depth 0, so it remains 0.
    // The child remains depth 1.
    const pastedChild = window.locator('tr[data-index="2"] td').first();
    await expect(pastedChild).toHaveCSS('padding-left', '30px'); // 10 + 1 * 20
  });

  test('Pasting adjusts relative depth correctly', async () => {
    await window.locator('#grid-container').focus();

    // Cut row 2 (Call client, depth 0)
    await window.keyboard.press('ArrowDown');
    await window.keyboard.press('ArrowDown');
    await window.keyboard.press('F3');
    
    // Grid now has 2 rows
    const gridRows = window.locator('#grid-body tr');
    await expect(gridRows).toHaveCount(2);

    // After cutting the last row, focus automatically shifts up to "Review budget" (depth 1)
    const activeCell = window.locator('td.active-cell');
    await expect(activeCell).toHaveText('• Review budget');

    // Paste "Call client" below "Review budget"
    // Since "Review budget" is depth 1, the pasted row should become depth 1
    await window.keyboard.press('F4');

    await expect(gridRows).toHaveCount(3);
    const pastedRowCell = window.locator('tr[data-index="2"] td').first();
    await expect(pastedRowCell).toHaveText('• Call client');
    await expect(pastedRowCell).toHaveCSS('padding-left', '30px'); // It should now be depth 1
  });
});
