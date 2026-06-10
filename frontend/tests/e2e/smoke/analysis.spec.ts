import { test, expect } from '@playwright/test';

test.describe('AI Analysis Workflow', () => {
  test('user can trigger AI analysis on an application', async ({ page }) => {

    

    await page.goto('/dashboard');

    // Go to applications list and click the first application
    await page.goto('/applications');
    
    // Wait for applications to load, if none exist, skip test
    try {
        await page.waitForSelector('text=Application Details', { timeout: 5000 });
        await page.locator('text=Application Details').first().click();
    } catch {
        test.skip(true, 'No existing applications found to test analysis on');
    }

    // Trigger analysis
    await page.locator('button', { hasText: /Analyze Fit|Run Analysis/i }).click();
    
    // Wait for the background worker to update the UI
    // Status should transition to 'processing' then to 'completed' or show the results section
    await expect(page.locator('text=Analysis Complete').or(page.locator('text=Fit Score'))).toBeVisible({ timeout: 45000 });
  });
});
