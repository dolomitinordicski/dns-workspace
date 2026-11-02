import { test, expect } from '@playwright/test';

test('generic invitation has Google login and never exposes operational tools', async ({ page }) => {
  await page.route('**/*', async route => {
    if (!['127.0.0.1','localhost'].includes(new URL(route.request().url()).hostname)) await route.abort();
    else await route.continue();
  });
  await page.goto('./?access=request');
  await expect(page.getByRole('heading', { name:/DNS-Zugang beantragen|Richiedi accesso a DNS/ })).toBeVisible();
  await expect(page.getByRole('button', { name:/Mit Google anmelden|Accedi con Google/ })).toBeEnabled();
  await expect(page.locator('[data-tool-id]')).toHaveCount(0);
  await expect(page.locator('input[type="password"]')).toHaveCount(0);
});

test('regular login exposes the generic access request link', async ({ page }) => {
  await page.goto('./');
  await expect(page.getByRole('link', { name:/Zugang mit Google beantragen|Richiedi accesso con Google/ })).toHaveAttribute('href','?access=request');
});
