const { chromium } = require("@playwright/test");

(async () => {
  console.log("Launching browser for scroll test...");
  const browser = await chromium.launch();
  
  const mobileContext = await browser.newContext({ viewport: { width: 375, height: 812 }, deviceScaleFactor: 2 });
  const mobilePage = await mobileContext.newPage();
  await mobilePage.goto("http://localhost:5173");
  await mobilePage.waitForTimeout(2000);
  
  // Click Routines tab to ensure we can scroll
  await mobilePage.getByText('Routines').click();
  await mobilePage.waitForTimeout(1000);
  
  await mobilePage.screenshot({ path: "nav_normal.png" });
  
  // Scroll down
  await mobilePage.evaluate(() => document.querySelector('main').scrollBy(0, 300));
  await mobilePage.waitForTimeout(1000);
  
  await mobilePage.screenshot({ path: "nav_scrolled.png" });

  await browser.close();
  console.log("Scroll test complete!");
})();
