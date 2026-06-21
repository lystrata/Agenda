const { test, expect } = require('@playwright/test');
test('Dump category HTML', async ({ page }) => {
  await page.goto('file://' + require('path').resolve(__dirname, '../index.html'));
  await page.keyboard.press('F9');
  await page.waitForTimeout(100);
  const html = await page.locator('#category-tree').innerHTML();
  console.log("HTML START\n" + html + "\nHTML END");
});
