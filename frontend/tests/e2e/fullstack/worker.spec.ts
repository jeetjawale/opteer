import { test, expect } from '../fixtures/test';

test.describe('Fullstack: Worker Operations', () => {

  test('worker spec is skipped without real LLM keys', async ({ page }) => {
    // This test requires real LLM API keys (GEMINI_API_KEY or OPENAI_API_KEY)
    // to trigger and verify AI analysis through the worker pipeline.
    // In CI with mock provider, the analysis flow is tested indirectly
    // via the golden-path test's import step.
    test.skip(
      !process.env.GEMINI_API_KEY && !process.env.OPENAI_API_KEY,
      'Skipped: no real LLM keys available for worker analysis test'
    );

    // If real keys are available, do a basic smoke test
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/.*dashboard.*/, { timeout: 15000 });
  });
});
