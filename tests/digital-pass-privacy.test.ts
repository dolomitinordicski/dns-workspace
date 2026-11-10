import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {digitalPassPrivacyUrl} from '../src/services/digitalPassPrivacy.ts';
test('uses only configured HTTPS notice URLs without credentials or query tokens',()=>{
 assert.equal(digitalPassPrivacyUrl('https://example.test/digital-pass/privacy'),'https://example.test/digital-pass/privacy');
 for(const bad of [undefined,'','javascript:alert(1)','http://example.test/privacy','https://u:p@example.test/privacy','https://example.test/privacy?token=a','https://example.test/privacy#x'])
  assert.equal(digitalPassPrivacyUrl(bad),null);
});
test('notice appears before the email form and no unrelated hardcoded notice remains',()=>{
 const html=readFileSync('pass.html','utf8'),code=readFileSync('src/pass-standalone.ts','utf8');
 assert.ok(html.indexOf('id="privacy-notice"')<html.indexOf('id="login"'));
 assert.ok(!html.includes('dolomitinordicski.com/de/privacy'));
 assert.match(code,/Boolean\(privacyUrl\)/);
 assert.match(code,/VITE_DNS_DIGITAL_PASS_PRIVACY_URL/);
});
