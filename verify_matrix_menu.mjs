import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.goto('file://' + process.cwd() + '/index.html');
  
  // Open menu
  await page.keyboard.press('/');
  // Navigate View -> Matrix Layout
  await page.keyboard.press('v');
  await page.keyboard.press('m');
  
  // Wait a bit
  await page.waitForTimeout(500);
  
  const layout = await page.evaluate(() => {
    const activeView = window.App.db.views.find(v => v.id === window.App.activeViewId);
    return activeView.layout;
  });
  
  const isMatrixHeadVisible = await page.evaluate(() => {
    const h = document.getElementById('matrix-head');
    return h && !h.classList.contains('hidden');
  });

  const matrixHtml = await page.evaluate(() => {
    return document.getElementById('matrix-head')?.innerHTML || '';
  });
  
  const gridHtml = await page.evaluate(() => {
    return document.getElementById('grid-body')?.innerHTML || '';
  });
  
  console.log('Layout:', layout);
  console.log('isMatrixHeadVisible:', isMatrixHeadVisible);
  console.log('matrixHtml:', matrixHtml);
  console.log('gridHtml:', gridHtml);
  
  await browser.close();
})();
