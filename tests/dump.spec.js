const { test, expect } = require('@playwright/test');
test('Dump grid HTML', async ({ page }) => {
  await page.goto('file://' + require('path').resolve(__dirname, '../index.html'));
  await page.keyboard.press('F8');
  await page.locator('#view-list li:has-text("By Assignee")').click();
  await page.waitForTimeout(100);
  const viewInfo = await page.evaluate(() => {
    return {
      activeViewId: window.App.activeViewId,
      activeViewName: window.App.db.views.find(v => v.id === window.App.activeViewId)?.name
    };
  });
  console.log("View Info:", viewInfo);
  const html = await page.locator('#grid-body').innerHTML();
  console.log("HTML START\n" + html + "\nHTML END");
});
