import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const src = (path) => readFileSync(new URL('../../' + path, import.meta.url), 'utf8');

test('staff access request observes staff Auth, never customer Digital Pass Auth', () => {
  const request = src('src/components/WorkspaceAccessRequest.tsx');
  assert.match(request, /import\s*\{\s*identityAuth\s*\}\s*from\s*['"]\.\.\/services\/identityFirebase['"]/);
  assert.match(request, /onAuthStateChanged\(identityAuth,/);
  assert.match(request, /identityAuth\.currentUser/);
  assert.doesNotMatch(request, /passAuth|customerAuth|digitalPassApi|customerFirebase/);
});
test('staff and Digital Pass customer use different Firebase named apps', () => {
  const staff = src('src/services/identityFirebase.ts');
  const pass = src('src/services/customerFirebase.ts');
  assert.match(staff, /initializeApp\(config, 'dns-core-staff'\)/);
  assert.match(pass, /CUSTOMER_AUTH_APP_NAME = 'dns-digital-pass'/);
  assert.doesNotMatch(staff, /initializeApp\(config, 'dns-digital-pass'\)/);
});
test('access requests use a callable associated with the staff app', () => {
  const requests = src('src/services/dnsAccessRequests.ts');
  assert.match(requests, /getFunctions\(identityApp,/);
  assert.doesNotMatch(requests, /passAuth|customerAuth|digitalPassApi/);
});
