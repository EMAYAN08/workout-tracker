
import { test, expect } from "@playwright/test";

test.describe("Routines Flow", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Routines", exact: true }).click();
  });

  test("should create and delete a routine", async ({ page }) => {
    // Dismiss any alerts automatically
    page.on("dialog", dialog => dialog.accept());
    
    await page.getByRole("button", { name: "New Routine" }).click();
    
    // Fill routine name
    await page.getByPlaceholder("e.g. Push Day, Full Body").fill("My Test Routine");
    
    // Add exercise
    await page.getByRole("button", { name: "Add Exercise" }).click();
    const searchInput = page.locator("input[placeholder=\"Search exercise...\"]");
    await searchInput.fill("Squat");
    
    // Add custom exercise from search overlay
    await page.getByRole("button", { name: "Add Custom Exercise" }).click();
    
    // Wait a bit
    await page.waitForTimeout(500);

    // Save routine
    await page.getByRole("button", { name: "Save", exact: true }).click();
    
    // Check it appears in list
    await expect(page.locator("text=My Test Routine").first()).toBeVisible();
  });
});

