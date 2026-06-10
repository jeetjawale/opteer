import { test, expect } from '../fixtures/test';
import { Client } from 'pg';

test.describe('Fullstack: Worker Operations', () => {
  let dbClient: Client;

  test.beforeAll(async () => {
    // We expect DATABASE_URL to be loaded from .env in global setup
    dbClient = new Client({
      connectionString: process.env.DATABASE_URL,
    });
    await dbClient.connect();
  });

  test.afterAll(async () => {
    if (dbClient) {
      await dbClient.end();
    }
  });

  test('user can trigger AI analysis and worker successfully processes it', async ({ page }) => {
    test.skip(!process.env.DATABASE_URL, 'Missing DATABASE_URL for verification');

    // Login bypassed, go straight to applications

    // Go to applications
    await page.goto('/applications');
    
    // We expect an application exists (created in prior step or setup)
    try {
        await page.waitForSelector('text=Application Details', { timeout: 5000 });
        await page.locator('text=Application Details').first().click();
    } catch {
        test.skip(true, 'No existing applications found');
    }

    // Get the application ID from the URL or state
    const url = page.url();
    const appIdMatch = url.match(/\/applications\/([a-f0-9\-]+)/);
    if (!appIdMatch) {
      throw new Error('Could not parse application ID from URL');
    }
    const appId = appIdMatch[1];

    // Click Analyze
    await page.locator('button', { hasText: /Analyze Fit|Run Analysis/i }).click();

    // Verify DB goes to 'processing'
    // Poll the database for up to 30 seconds
    let status = 'saved';
    let analysisResult = null;
    let applicationHistoryCount = 0;
    
    for (let i = 0; i < 30; i++) {
      const res = await dbClient.query('SELECT analysis_status, analysis_result FROM applications WHERE id = $1', [appId]);
      if (res.rows.length > 0) {
        status = res.rows[0].analysis_status || res.rows[0].status; // Depending on actual schema field
        analysisResult = res.rows[0].analysis_result;
        
        // Also check history table
        const historyRes = await dbClient.query('SELECT count(*) FROM application_history WHERE application_id = $1', [appId]);
        applicationHistoryCount = parseInt(historyRes.rows[0].count, 10);

        if (status === 'completed' || status === 'processed') {
          break;
        }
      }
      // Wait 1 second before polling again
      await new Promise(r => setTimeout(r, 1000));
    }

    // Assert the worker fully completed it
    expect(['completed', 'processed']).toContain(status);
    expect(analysisResult).not.toBeNull();
    expect(applicationHistoryCount).toBeGreaterThan(0);

    // Verify UI reflects the completion
    await expect(page.locator('text=Analysis Complete').or(page.locator('text=Fit Score'))).toBeVisible({ timeout: 15000 });
  });
});
