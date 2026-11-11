import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, access } from 'node:fs/promises';

const source = async p => readFile(new URL('../' + p, import.meta.url), 'utf8');

test('single dedicated AI panel has no backend or Firestore dependency', async () => {
  const ui = await source('src/components/WorkspaceAIImpact.tsx');
  const cockpit = await source('src/components/WorkspaceCockpit.tsx');
  assert.match(ui, /useAIImpactSnapshot/);
  assert.match(ui, /currentCollaborationEstimate/);
  assert.doesNotMatch(ui, /firebase\/firestore|identityFirebase|parseSnapshot|fetch\(/);
  assert.equal((cockpit.match(/<WorkspaceAIImpact /g) ?? []).length, 1);
  assert.doesNotMatch(cockpit, /WorkspaceAICollaboration/);
  await assert.rejects(access(new URL('../src/components/WorkspaceAICollaboration.tsx', import.meta.url)));
});

test('service exclusively owns snapshot retrieval and validator', async () => {
  const service = await source('src/ai-impact/service.ts');
  const hook = await source('src/ai-impact/useAIImpactSnapshot.ts');
  const estimate = await source('src/ai-impact/collaboration.ts');
  assert.match(service, /adminAiImpactSnapshots/);
  assert.match(service, /memberAiImpactSnapshots/);
  assert.match(service, /parseAIImpactSnapshot/);
  assert.match(service, /ai-impact\/latest\.json/);
  assert.match(hook, /loadAIImpactSnapshot/);
  assert.match(hook, /active = false/);
  assert.match(estimate, /futureRevisions/);
  assert.match(estimate, /collaborationHours/);
});

test('the baseline is kept while unverified environmental values remain hidden', async () => {
  const baseline = JSON.parse(await source('src/data/ai-collaboration-preliminary.json'));
  assert.equal(baseline.collaborationHours.central, 170);
  assert.equal(baseline.energyKwh, null);
  assert.equal(baseline.waterLitres, null);
  assert.ok(Array.isArray(baseline.futureRevisions));
});
