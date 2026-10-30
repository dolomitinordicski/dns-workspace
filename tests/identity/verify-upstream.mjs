import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
const manifest = JSON.parse(readFileSync(new URL('./upstream/provenance.json', import.meta.url), 'utf8'));
for (const [name, hash] of Object.entries(manifest.sha256)) {
  assert.equal(createHash('sha256').update(readFileSync(new URL(`./upstream/${name}`, import.meta.url))).digest('hex'), hash,
    `${name} must remain byte-for-byte identical to the pinned upstream source`);
}
console.log(`Verified unchanged upstream snapshots at ${manifest.commit}`);
