
import { test, expect } from "@playwright/test";

test.describe("Workout Flow", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("should complete a full workout flow", async ({ page }) => {
    await page.getByRole("button", { name: "Start Empty Workout" }).click();
    await expect(page.getByRole("button", { name: "Finish", exact: true })).toBeVisible();

    await page.getByRole("button", { name: "Add Exercise" }).click();
    
    const searchInput = page.locator("input[placeholder=\"Search exercise...\"]");
    await expect(searchInput).toBeVisible();
    await searchInput.fill("My Playwright Squat");
    
    await page.waitForTimeout(500);
    // There should be an Add Custom Exercise button because it doesn"t exist in API
    await page.getByRole("button", { name: "Add Custom Exercise" }).click();
    
    // Check if exercise was added to workout
    await expect(page.locator("text=My Playwright Squat").first()).toBeVisible();
    
    // Add a set
    await page.getByRole("button", { name: "New Set" }).click();
    
    // Finish the workout
    await page.getByRole("button", { name: "Finish", exact: true }).click();
    
    await expect(page.getByRole("button", { name: "Start Empty Workout" })).toBeVisible();
  });
});

