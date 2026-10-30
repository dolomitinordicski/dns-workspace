import { test } from 'node:test';
import assert from 'node:assert/strict';
import { requireEmulators } from './safety.mjs';
test('seeding refuses missing emulator settings and any production project or remote host', () => {
  const original = { ...process.env };
  try {
    for (const overrides of [
      { GCLOUD_PROJECT: 'dns-core' },
      { FIRESTORE_EMULATOR_HOST: 'firestore.googleapis.com:443' },
      { FIREBASE_AUTH_EMULATOR_HOST: 'identitytoolkit.googleapis.com:443' },
      { FIRESTORE_EMULATOR_HOST: '' },
    ]) {
      Object.assign(process.env, { GCLOUD_PROJECT: 'demo-dns-identity', FIRESTORE_EMULATOR_HOST: '127.0.0.1:8188', FIREBASE_AUTH_EMULATOR_HOST: '127.0.0.1:9199' }, overrides);
      assert.throws(requireEmulators);
    }
  } finally { process.env = original; }
});
