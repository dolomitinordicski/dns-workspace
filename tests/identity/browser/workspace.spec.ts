import { test, expect } from '@playwright/test';
import { seed, A, U, password } from '../seed.mjs';
test.beforeAll(async () => { await seed(); });
for (const role of ['writer', 'reader', 'outsider', 'admin'] as const) {
  test(`${role}: login resolves organization context and enforces available tools`, async ({ page }) => {
    const external: string[] = [];
    await page.route('**/*', async route => {
      const url = new URL(route.request().url());
      if (!['127.0.0.1', 'localhost'].includes(url.hostname)) {
        const canonicalSharedAsset = url.hostname === 'raw.githubusercontent.com'
          && url.pathname.startsWith('/dolomitinordicski/dns-shared-data/');
        if (canonicalSharedAsset) {
          await route.continue();
          return;
        }
        if (!['image', 'font', 'stylesheet'].includes(route.request().resourceType())) external.push(url.origin);
        await route.abort();
      } else await route.continue();
    });
    await page.goto('./');
    await expect(page.getByRole('combobox')).toHaveCount(0);
    await page.getByLabel(/E-Mail|Email/).fill(`${U[role]}@example.test`);
    await page.getByLabel(/Passwort|Password/).fill(password);
    await page.getByRole('button', { name: /^(Anmelden|Accedi)$/ }).click();
    await expect(page.getByRole('heading', { name: /DNS Netzwerk|Rete DNS|Gebiet im Überblick|Area in sintesi/ })).toBeVisible();

    const card = page.locator('[data-sidebar-tool-id="data-entry"]');
    if (role === 'outsider') await expect(card).toHaveCount(0);
    else await expect(card).toBeVisible();
    if (role === 'writer') await expect(page.locator('[data-sidebar-tool-id="polls"]')).toHaveCount(0);

    if (role === 'admin') {
      const select = page.getByRole('combobox');
      await expect(select).toBeVisible();
      await select.selectOption(A.secondaryOrganizationId);
      await expect(card).toBeVisible();
      await select.selectOption(A.foreignOrganizationId);
      // Foreign organization is configured with Data Entry = none.
      // The admin keeps all privileges but the area preview hides the tool.
      await expect(card).toHaveCount(0);
      await expect(page.getByText(/Keine Tools für dieses Gebiet freigegeben|Nessun tool abilitato per quest’area/)).toBeVisible();
      await select.selectOption(A.organizationId);
      await expect(card).toBeVisible();
    } else {
      await expect(page.getByRole('combobox')).toHaveCount(0);
    }

    await page.getByRole('button', { name: /^(Abmelden|Esci)$/ }).click();
    await expect(page.getByLabel(/Passwort|Password/)).toBeVisible();
    await expect(card).toHaveCount(0);
    expect(external).toEqual([]);
  });
}
test('invalid password does not activate an identity', async ({ page }) => {
  await page.goto('./');
  await page.getByLabel(/E-Mail|Email/).fill(`${U.writer}@example.test`);
  await page.getByLabel(/Passwort|Password/).fill('incorrect-password');
  await page.getByRole('button', { name: /^(Anmelden|Accedi)$/ }).click();
  await expect(page.getByRole('alert')).toBeVisible();
  await expect(page.locator('[data-sidebar-tool-id="data-entry"]')).toHaveCount(0);
});


for (const uid of ['dns-test-inactive', 'dns-test-missing-profile']) {
  test(`${uid}: authentication alone cannot activate Workspace`, async ({ page }) => {
    await page.goto('./');
    await page.getByLabel(/E-Mail|Email/).fill(`${uid}@example.test`);
    await page.getByLabel(/Passwort|Password/).fill(password);
    await page.getByRole('button', { name: /^(Anmelden|Accedi)$/ }).click();
    await expect(page.getByRole('alert')).toBeVisible();
    await expect(page.locator('[data-sidebar-tool-id="data-entry"]')).toHaveCount(0);
    await expect(page.getByRole('button', { name: /^(Abmelden|Esci)$/ })).toBeVisible();
  });
}
