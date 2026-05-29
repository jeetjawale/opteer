import { test, expect } from '@playwright/test';
import { loginUser } from './helpers/auth';

test.describe('Job Import and Polling Lifecycle', () => {
  test.beforeEach(async ({ page }) => {
    await loginUser(page);
  });

  test('should open import modal and allow bulk import submission', async ({ page }) => {
    // Click the New Application / Import button
    await page.click('button:has-text("Import")');
    
    // Expect modal to open
    await expect(page.locator('text=Import a job posting')).toBeVisible();
    
    // Switch to bulk mode
    await page.click('button:has-text("Bulk Import")');
    
    // Fill the textarea with multiple URLs
    await page.fill('textarea#job-urls', 'https://example.com/job/1\nhttps://example.com/job/2');
    
    // Provide a basic resume text instead of uploading for faster testing
    await page.fill('textarea#resume', 'Experienced software engineer with TypeScript and React skills.');
    
    // Submit
    await page.click('button:has-text("Import 2 Jobs")');
    
    // Verify progress UI appears
    await expect(page.locator('text=Processing Bulk Import')).toBeVisible();
    await expect(page.locator('text=Importing 1 of 2 URLs')).toBeVisible();
    
    // Stop the import for test speed and safety
    await page.click('button:has-text("Stop Processing")');
    
    // Expect cancellation state
    await expect(page.locator('text=Import was cancelled.')).toBeVisible();
  });

  test('should deduplicate identical URLs locally', async ({ page }) => {
    await page.click('button:has-text("Import")');
    await page.click('button:has-text("Bulk Import")');
    
    // Paste duplicate URL
    await page.fill('textarea#job-urls', 'https://example.com/job/1\nhttps://example.com/job/1');
    
    // Assert deduplication message
    await expect(page.locator('text=Skipping 1 duplicate')).toBeVisible();
  });
});
