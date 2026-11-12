import {readFileSync,existsSync} from 'node:fs';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
const html=readFileSync('pass.html','utf8');
const page=readFileSync('src/pass-standalone.ts','utf8');
const app=readFileSync('src/App.tsx','utf8');
const stylesheet=readFileSync('src/pass-standalone.css','utf8');
const config=readFileSync('vite.config.ts','utf8');
assert.match(config,/digitalPass:.*pass\.html/, 'Vite must generate a separate standalone entry');
assert.doesNotMatch(html,/data-dns-tool-header/, 'Public page deliberately has no app header');
assert.match(html,/data-dns-tool-footer/);

assert.match(html,/pass-standalone\.css/);
assert.doesNotMatch(html,/<style[ >]/, 'Styles must not live inline in HTML');
assert.match(stylesheet,/--color-dns-deep/);
assert.doesNotMatch(page,/foundation|WorkspaceHeader|React/i, 'Public entry must not import Workspace or Foundation runtime');
assert.doesNotMatch(app,/DigitalPassGuest|DigitalPassScanner/, 'Workspace must link to standalone page');
assert.match(app,/href="\/dns-workspace\/pass\.html"/);
assert.ok(!existsSync('public/pass.html'), 'Old Workspace redirect must not shadow standalone page');
console.log('✓ DNS Digital Pass has isolated HTML, CSS and JS, canonical header/footer and no Foundation runtime');

const brandCss=readFileSync('src/pass-corporate.css','utf8');
const offlineCopy=readFileSync('src/services/offlinePass.ts','utf8');
const serviceWorker=readFileSync('public/digital-pass-sw.js','utf8');
const gitBlobSha=(file)=>{
 const data=readFileSync(file);
 return createHash('sha1').update('blob '+data.length+String.fromCharCode(0)).update(data).digest('hex');
};
assert.equal(gitBlobSha('public/dns-season-art-2026-27.webp'),'ea0489f0fce1f66231a7d7944ccc9349f951c3ca','Card illustration must match approved original');
assert.equal(gitBlobSha('public/dns-logo-official.png'),'efb66702c8d984cc1fa0cad1e8c8e1758ee682ce','Logo must match official Foundation v1.4.1');
for(const fragment of ['dns-season-art-2026-27.webp','dns-logo-official.png','id="dns-pass-flip"','id="pass-front-number"','id="pass-organization"','id="pass-back"','id="qr"'])
 assert.ok(html.includes(fragment),'Missing expected pass markup: '+fragment);
assert.ok(brandCss.includes('prefers-reduced-motion'));
assert.ok(offlineCopy.includes('JSON.stringify(safe)'),'Persist only allowlisted visual fields');
assert.ok(!offlineCopy.includes('JSON.stringify(pass)'),'Never persist QR or live credential');
assert.ok(serviceWorker.includes('dns-season-art-2026-27.webp'));
assert.ok(serviceWorker.includes('dns-logo-official.png'));
console.log('✓ Approved DNS art, flip, offline safety and PWA cache verified');
