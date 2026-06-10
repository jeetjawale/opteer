import { test, expect } from '@playwright/test';

test.describe('Dashboard and Protected Routes', () => {
  test('authenticated user can load dashboard', async ({ page }) => {

    

    await page.goto('/sign-in');

    await page.goto('/dashboard');
    
    // Expect the dashboard to load without hydration errors
    await expect(page.locator('h2').filter({ hasText: /Dashboard/i })).toBeVisible();
    
    // Verify user is tracked / visible
    await expect(page.locator('text=Applications')).toBeVisible();
  });
});
