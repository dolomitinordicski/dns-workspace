import assert from 'node:assert/strict';
export const projectId = 'demo-dns-identity';
export function requireEmulators() {
  assert.equal(process.env.GCLOUD_PROJECT, projectId, 'Only the dedicated demo project is allowed');
  assert.equal(process.env.FIRESTORE_EMULATOR_HOST, '127.0.0.1:8188');
  assert.equal(process.env.FIREBASE_AUTH_EMULATOR_HOST, '127.0.0.1:9199');
}
