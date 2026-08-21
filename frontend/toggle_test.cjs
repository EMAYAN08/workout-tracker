const { chromium } = require("@playwright/test");

(async () => {
  console.log("Launching browser for toggle test...");
  const browser = await chromium.launch();
  
  const mobileContext = await browser.newContext({ viewport: { width: 375, height: 812 }, deviceScaleFactor: 2 });
  const mobilePage = await mobileContext.newPage();
  await mobilePage.goto("http://localhost:5173");
  await mobilePage.waitForTimeout(2000);
  
  // Crop to just the header area where the toggle is
  const header = mobilePage.locator('.app-header');
  await header.screenshot({ path: "toggle_lbs.png" });
  
  // Click the toggle (KGS is the text on the toggle, we can just click the button containing LBS/KGS)
  await mobilePage.getByRole('button', { name: /LBS/i }).click();
  await mobilePage.waitForTimeout(1000);
  
  await header.screenshot({ path: "toggle_kgs.png" });

  await browser.close();
  console.log("Toggle test complete!");
})();
