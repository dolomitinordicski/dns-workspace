import { test, expect } from '@playwright/test';
import { seed, A, U, password } from '../seed.mjs';
test.beforeAll(async () => { await seed(); });
for (const role of ['writer', 'reader', 'outsider', 'admin'] as const) {
  test(`${role}: real emulator login, organization selection, matrix and logout`, async ({ page }) => {
    const external: string[] = [];
    // Local assets and emulator requests are the only permitted browser traffic.
    await page.route('**/*', async route => {
      const url = new URL(route.request().url());
      if (!['127.0.0.1', 'localhost'].includes(url.hostname)) {
        if (!['image', 'font', 'stylesheet'].includes(route.request().resourceType())) external.push(url.origin);
        await route.abort();
      } else await route.continue();
    });
    await page.goto('./');
    await page.getByRole('combobox').selectOption(A.organizationId);
    await page.getByLabel(/E-Mail|Email/).fill(`${U[role]}@example.test`);
    await page.getByLabel(/Passwort|Password/).fill(password);
    await page.getByRole('button', { name: /^(Anmelden|Accedi)$/ }).click();
    await expect(page.getByRole('heading', { name: /Mein DNS Cockpit|Il mio cockpit DNS/ })).toBeVisible();
    if (role === 'writer') await expect(page.locator('[data-tool-id="polls"]')).toHaveCount(0);
    const card = page.locator('[data-tool-id="data-entry"]');
    if (role === 'outsider') await expect(card).toHaveCount(0);
    else await expect(card).toBeVisible();
    // Selection after login uses actual memberships returned by Firestore.
    const select = page.getByRole('combobox');
    if (role !== 'outsider' && role !== 'admin') {
      await expect(select.locator(`option[value="${A.foreignOrganizationId}"]`)).toHaveCount(0);
    }
    await select.selectOption(A.secondaryOrganizationId);
    if (role === 'outsider') await expect(card).toHaveCount(0);
    else await expect(card).toBeVisible(); // R is visible; writing is checked by the rules suite.
    if (role === 'admin' || role === 'outsider') {
      await select.selectOption(A.foreignOrganizationId);
      if (role === 'admin') await expect(card).toBeVisible();
      else await expect(card).toHaveCount(0); // “–” caps otherwise sufficient grants.
    }
    await page.getByRole('button', { name: /^(Abmelden|Esci)$/ }).click();
    await expect(page.getByLabel(/Passwort|Password/)).toBeVisible();
    await expect(card).toHaveCount(0);
    expect(external).toEqual([]);
  });
}
test('invalid password does not activate an identity', async ({ page }) => {
  await page.goto('./');
  await page.getByRole('combobox').selectOption(A.organizationId);
  await page.getByLabel(/E-Mail|Email/).fill(`${U.writer}@example.test`);
  await page.getByLabel(/Passwort|Password/).fill('incorrect-password');
  await page.getByRole('button', { name: /^(Anmelden|Accedi)$/ }).click();
  await expect(page.getByRole('alert')).toBeVisible();
  await expect(page.locator('[data-tool-id="data-entry"]')).toHaveCount(0);
});


for (const uid of ['dns-test-inactive', 'dns-test-missing-profile']) {
  test(`${uid}: authentication alone cannot activate Workspace`, async ({ page }) => {
    await page.goto('./');
    await page.getByRole('combobox').selectOption(A.organizationId);
    await page.getByLabel(/E-Mail|Email/).fill(`${uid}@example.test`);
    await page.getByLabel(/Passwort|Password/).fill(password);
    await page.getByRole('button', { name: /^(Anmelden|Accedi)$/ }).click();
    await expect(page.getByRole('alert')).toBeVisible();
    await expect(page.locator('[data-tool-id="data-entry"]')).toHaveCount(0);
    await expect(page.getByRole('button', { name: /^(Abmelden|Esci)$/ })).toBeVisible();
  });
}
