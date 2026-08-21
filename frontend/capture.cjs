
const { chromium } = require("@playwright/test");

(async () => {
  console.log("Launching browser...");
  const browser = await chromium.launch();
  
  console.log("Capturing Mobile View...");
  const mobileContext = await browser.newContext({ viewport: { width: 375, height: 812 }, deviceScaleFactor: 2 });
  const mobilePage = await mobileContext.newPage();
  await mobilePage.goto("http://localhost:5173");
  await mobilePage.waitForTimeout(3000); // let UI settle
  await mobilePage.screenshot({ path: "mobile_dashboard.png" });
  
  await mobilePage.getByRole("button", { name: "Start Empty Workout" }).click();
  await mobilePage.waitForTimeout(2000);
  await mobilePage.screenshot({ path: "mobile_workout.png" });

  console.log("Capturing Desktop View...");
  const desktopContext = await browser.newContext({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 2 });
  const desktopPage = await desktopContext.newPage();
  await desktopPage.goto("http://localhost:5173");
  await desktopPage.waitForTimeout(3000);
  await desktopPage.screenshot({ path: "desktop_dashboard.png" });

  await desktopPage.getByRole("button", { name: "Start Empty Workout" }).click();
  await desktopPage.waitForTimeout(2000);
  await desktopPage.screenshot({ path: "desktop_workout.png" });

  await browser.close();
  console.log("Capture complete!");
})();

