import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
const read = p => readFileSync(p, 'utf8');

test('customer pass install UX does not change staff Workspace or activation backend', () => {
  const html = read('pass.html');
  const app = read('src/pass-standalone.ts');
  const install = read('src/services/passInstall.ts');
  const manifest = JSON.parse(read('public/digital-pass.webmanifest'));
  assert.match(html, /id="install-pass"[^>]*hidden/);
  assert.match(html, /id="home-tip"/);
  assert.match(app, /setupPassInstall/);
  assert.match(app, /passInstall\.refresh\(Boolean\(pass&&\(authorized\|\|offline\)\)\)/);
  assert.match(install, /beforeinstallprompt/);
  assert.match(install, /appinstalled/);
  assert.match(install, /candidate\.prompt\(\)/);
  assert.match(install, /Aggiungi alla schermata Home/);
  assert.match(install, /Zum Home-Bildschirm/);
  assert.match(install, /Add to Home Screen/);
  assert.equal(manifest.display, 'standalone');
  assert.equal(manifest.start_url, '/dns-workspace/pass.html');
  assert.doesNotMatch(install, /firebase|passRequest|identityAuth|fetch\(/);
});
