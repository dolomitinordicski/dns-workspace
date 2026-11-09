import test from 'node:test';
import assert from 'node:assert/strict';
import { createDNSThemeMessage, dnsToolThemeOrigin, parseDNSThemeMessage } from '../../src/workspace/themeBridge';

const origin = 'https://dolomitinordicski.github.io';
for (const preference of ['system', 'light', 'dark'] as const) {
  test(`accepts ${preference} without sharing identity data`, () => {
    const message = createDNSThemeMessage(preference);
    assert.deepEqual(parseDNSThemeMessage(message, origin, origin), message);
    assert.deepEqual(Object.keys(message).sort(), ['preference', 'type']);
  });
}
test('rejects untrusted origins and malformed messages', () => {
  assert.equal(parseDNSThemeMessage(createDNSThemeMessage('dark'), 'https://evil.example', origin), null);
  assert.equal(parseDNSThemeMessage({ type: 'dns:theme:v1', preference: 'admin' }, origin, origin), null);
  assert.equal(parseDNSThemeMessage({ type: 'dns:auth:v1', preference: 'dark' }, origin, origin), null);
  assert.equal(parseDNSThemeMessage(null, origin, origin), null);
});
test('uses existing DNS Pages origin allowlist', () => {
  assert.equal(dnsToolThemeOrigin(origin + '/DNS-Data-Entry/'), origin);
  assert.throws(() => dnsToolThemeOrigin('https://evil.example/tool'), /UNSUPPORTED_WORKSPACE_TOOL_ORIGIN/);
  assert.throws(() => dnsToolThemeOrigin('http://dolomitinordicski.github.io/tool'), /UNSUPPORTED_WORKSPACE_TOOL_ORIGIN/);
});
