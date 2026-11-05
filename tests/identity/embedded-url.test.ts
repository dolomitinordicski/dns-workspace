import { test } from 'node:test';
import assert from 'node:assert/strict';
import { workspaceEmbeddedUrl } from '../../src/workspace/embeddedUrl.ts';

test('Workspace iframe sets embedded mode on a DNS tool', () => {
  assert.equal(
    workspaceEmbeddedUrl('https://dolomitinordicski.github.io/dns-partner-hub/'),
    'https://dolomitinordicski.github.io/dns-partner-hub/?embedded=1',
  );
});

test('existing query parameters and hash are preserved', () => {
  assert.equal(
    workspaceEmbeddedUrl('https://dolomitinordicski.github.io/dns-flyer-studio/?lang=de#prices'),
    'https://dolomitinordicski.github.io/dns-flyer-studio/?lang=de&embedded=1#prices',
  );
});

test('existing embedded flag is overwritten, not duplicated', () => {
  assert.equal(
    workspaceEmbeddedUrl('https://dolomitinordicski.github.io/dns-workspace/?embedded=0'),
    'https://dolomitinordicski.github.io/dns-workspace/?embedded=1',
  );
});

test('rejects external tool URLs', () => {
  assert.throws(() => workspaceEmbeddedUrl('https://example.com/tool'), /UNSUPPORTED_WORKSPACE_TOOL_ORIGIN/);
  assert.throws(() => workspaceEmbeddedUrl('http://dolomitinordicski.github.io/tool'), /UNSUPPORTED_WORKSPACE_TOOL_ORIGIN/);
});
