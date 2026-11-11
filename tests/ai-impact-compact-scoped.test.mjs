import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { listRepos } from '../scripts/ai-impact-collector.mjs';

test('operational DNS scope excludes unrelated research and legacy repositories', async () => {
  const names=await listRepos();
  assert.deepEqual(names,[
    'dns-workspace','dns-shared-data','DNS-Data-Entry','DNS-Flyer-Studio','analytics',
    'fairmodel','DNS-Faktura','DNS-Polls-tool','dns-partner-hub','partnerportal','hub','dns-wiki',
  ]);
  for (const other of ['strategy','smartslopes','360ARtool','qrcodegen']) {
    assert.equal(names.some(x=>x.toLowerCase()===other.toLowerCase()),false);
  }
});

test('only a single compact AI dashboard is mounted in Workspace', async () => {
  const cockpit=await readFile(new URL('../src/components/WorkspaceCockpit.tsx',import.meta.url),'utf8');
  const impact=await readFile(new URL('../src/components/WorkspaceAIImpact.tsx',import.meta.url),'utf8');
  assert.match(cockpit, /<WorkspaceAIImpact /);
  assert.doesNotMatch(cockpit, /<WorkspaceAICollaboration /);
  assert.match(impact, /<meter /);
  assert.match(impact, /<details>/);
  assert.doesNotMatch(impact, /snapshot\.observed\.repositories\}/);
  assert.match(impact, /Da verificare/);
});

test('original human-AI estimate is retained and future dated revisions may be appended', async () => {
  const baseline=JSON.parse(await readFile(new URL('../src/data/ai-collaboration-preliminary.json',import.meta.url),'utf8'));
  assert.deepEqual(baseline.collaborationHours,{low:120,central:170,high:220});
  assert.equal(baseline.periodEnd,'2026-11-10');
  assert.ok(Array.isArray(baseline.futureRevisions));
  assert.equal(baseline.futureRevisions.length,0);
});
