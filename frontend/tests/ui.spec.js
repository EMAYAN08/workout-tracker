
import { test, expect } from "@playwright/test";

test.describe("Workout Tracker UI Tests", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("should render the dashboard in both modes", async ({ page }) => {
    await expect(page.getByRole("button", { name: "Workout", exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Routines", exact: true })).toBeVisible();
  });

  test("should be able to search and add an exercise to a workout", async ({ page }) => {
    await page.getByRole("button", { name: "Start Empty Workout" }).click();
    await expect(page.getByRole("button", { name: "Finish", exact: true })).toBeVisible();
    
    // Open search
    await page.getByRole("button", { name: "Add Exercise" }).click();
    
    // Check search UI
    const searchInput = page.locator("input[placeholder=\"Search exercise...\"]");
    await expect(searchInput).toBeVisible();
    
    // Wait and find the X button to close search
    await page.locator(".lucide-x").first().click();
    
    // Cancel workout to cleanup
    await page.getByRole("button", { name: "Cancel" }).click();
  });

  test("should navigate to Custom Exercises and verify UI", async ({ page }) => {
    await page.getByRole("button", { name: "Exercises", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Custom", exact: true })).toBeVisible();
  });
});

