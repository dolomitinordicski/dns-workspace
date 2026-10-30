import { readdirSync, readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
const scripts = readdirSync('dist/assets').filter(n => n.endsWith('.js'));
assert.ok(scripts.length > 0);
for (const name of scripts) {
  const content = readFileSync(`dist/assets/${name}`, 'utf8');
  for (const forbidden of ['demo-dns-identity', '127.0.0.1:9199', 'IDENTITY_EMULATORS_REQUIRE_LOCAL_DEVELOPMENT']) {
    assert.ok(!content.includes(forbidden), `Production bundle ${name} contains emulator-only configuration: ${forbidden}`);
  }
}
console.log('Production bundles contain no Identity emulator configuration');
