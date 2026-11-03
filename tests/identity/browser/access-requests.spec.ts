import { test, expect } from '@playwright/test';
import { initializeTestEnvironment } from '@firebase/rules-unit-testing';
import { doc, setDoc } from 'firebase/firestore';
import { seed, U, password } from '../seed.mjs';

test.beforeAll(async () => {
  await seed();
  const env = await initializeTestEnvironment({ projectId:'demo-dns-identity', firestore:{host:'127.0.0.1',port:8188} });
  await env.withSecurityRulesDisabled(async c => {
    const db=c.firestore();
    await setDoc(doc(db,'organizations','dns-approval-test-org'),{id:'dns-approval-test-org',active:true,
      organizationType:'tourism-organisation',canonicalName:'DNS Approval Test',reportingAreaIds:['dns-approval-test-area']});
    await setDoc(doc(db,'reportingAreas','dns-approval-test-area'),{id:'dns-approval-test-area',active:true});
    await setDoc(doc(db,'organizationToolAccess','dns-approval-test-org'),{organizationId:'dns-approval-test-org',
      tools:{'data-entry':'write','flyer-studio':'read'}});
  });
  await env.cleanup();
});

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

test('Google request, administrator approval, status refresh and approved login', async ({ page, browser }) => {
  test.skip(process.env.DNS_ACCESS_ACCEPTANCE !== 'true', 'Requires the dedicated Functions acceptance workflow');
  test.setTimeout(90000);
  await page.context().route('**/*', async route => {
    const url=new URL(route.request().url());
    // Firebase's Google popup resolver downloads Google's static iframe library,
    // even with Auth Emulator. Allow scripts only; authentication/data stay local.
    const staticGoogleScript=url.protocol==='https:' && url.hostname==='apis.google.com'
      && route.request().resourceType()==='script';
    if (!['127.0.0.1','localhost'].includes(url.hostname) && !staticGoogleScript) await route.abort();
    else await route.continue();
  });
  const googleLogin = async () => {
    const popupPromise=page.waitForEvent('popup');
    await page.getByRole('button',{name:/Mit Google anmelden|Accedi con Google/}).click();
    const popup=await popupPromise;
    await popup.getByRole('button',{name:'Add new account'}).click();
    await popup.locator('#email-input').fill('browser-approval@example.test');
    await popup.getByRole('button',{name:/Sign in with Google/}).click();
  };
  await page.goto('./?access=request');
  await googleLogin();
  await page.getByRole('combobox').selectOption('dns-approval-test-org');
  await page.getByRole('button',{name:/Anfrage senden|Invia richiesta/}).click();
  await expect(page.getByText(/Anfrage wartet auf Freigabe|Richiesta in attesa di approvazione/)).toBeVisible();
  await expect(page.locator('[data-tool-id]')).toHaveCount(0);
  const adminContext=await browser.newContext();
  const admin=await adminContext.newPage();
  await admin.goto('http://127.0.0.1:4173/dns-workspace/');
  await admin.getByLabel(/E-Mail|Email/).fill(`${U.admin}@example.test`);
  await admin.getByLabel(/Passwort|Password/).fill(password);
  await admin.getByRole('button',{name:/^(Anmelden|Accedi)$/}).click();
  await admin.getByRole('button',{name:/DNS verwalten|Gestione DNS/}).click();
  await admin.getByRole('tab',{name:/Benutzer|Utenti/}).click();
  const row=admin.getByRole('article').filter({hasText:'browser-approval@example.test'});
  await row.getByRole('button',{name:/Freigabe prüfen|Verifica approvazione/}).click();
  await expect(row.getByText('data-entry: W',{exact:true})).toBeVisible();
  await expect(row.getByText('flyer-studio: R',{exact:true})).toBeVisible();
  await row.getByRole('button',{name:/Freigabe bestätigen|Conferma approvazione/}).click();
  await expect(row.getByText(/Freigegeben|Approvata/,{exact:true})).toBeVisible();
  await page.getByRole('button',{name:/Status aktualisieren|Aggiorna stato/}).click();
  await expect(page.getByText(/Freigegeben. Melden|Richiesta approvata/)).toBeVisible();
  await page.screenshot({path:'test-results/access-approved.png',fullPage:true});
  // Approval does not alter Google credentials; a fresh login loads the new DNS profile.
  await page.getByRole('button',{name:/^(Abmelden|Esci)$/}).click();
  await googleLogin();
  await expect(page.getByText(/Freigegeben. Melden|Richiesta approvata/)).toBeVisible();
  await page.getByRole('link',{name:/Zum Workspace|Vai al Workspace/}).click();
  await expect(page.getByRole('combobox')).toHaveCount(0);
  await expect(page.getByRole('heading',{name:/Willkommen|Benvenuto/})).toBeVisible();
  await expect(page.locator('[data-sidebar-tool-id="data-entry"]')).toBeVisible();
  await adminContext.close();
});
