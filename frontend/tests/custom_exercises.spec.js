
import { test, expect } from "@playwright/test";

test.describe("Custom Exercises Flow", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Exercises", exact: true }).click();
  });

  test("should create, edit, and delete a custom exercise", async ({ page }) => {
    await page.getByRole("button", { name: "Create" }).click();
    await page.getByPlaceholder("e.g. Hex Bar Deadlift").fill("Playwright Exercise");
    await page.getByRole("button", { name: "Save Custom Exercise" }).click();
    
    await expect(page.locator("text=Playwright Exercise").first()).toBeVisible();
    
    // Wait for render
    await page.waitForTimeout(500);
    // Find the edit button inside the card for Playwright Exercise
    await page.locator(".text-blue-500").first().click();
    
    await page.getByPlaceholder("e.g. Hex Bar Deadlift").fill("Edited Playwright Exercise");
    await page.getByRole("button", { name: "Update Custom Exercise" }).click();
    
    await expect(page.locator("text=Edited Playwright Exercise").first()).toBeVisible();
    
    // Delete - button with red color
    await page.locator(".text-red-500").first().click();
    
    // Wait for deletion API
    await page.waitForTimeout(500);
    await expect(page.locator("text=Edited Playwright Exercise")).toHaveCount(0);
  });
});

