import test from 'node:test';
import assert from 'node:assert/strict';
import { summarize, publicSummary } from '../scripts/ai-impact-collector.mjs';

test('deduplicates GitHub activity and preserves daily buckets', () => {
  const rows = summarize(['shared-data','workspace'], [
    {repo:'workspace',sha:'a',date:'2026-11-09T14:00:00Z'},
    {repo:'workspace',sha:'a',date:'2026-11-09T14:00:00Z'},
    {repo:'workspace',sha:'b',date:'2026-11-10T14:00:00Z'},
    {repo:'workspace',sha:'old',date:'2026-09-09T14:00:00Z'},
  ],[
    {repo:'workspace',number:3,date:'2026-11-10T10:00:00Z'},
    {repo:'workspace',number:3,date:'2026-11-10T10:00:00Z'},
  ],[
    {repo:'shared-data',id:4,date:'2026-11-10T10:00:00Z'},
  ],'2026-10-01','2026-11-10','2026-11-10T21:00:00Z');
  assert.equal(rows.latest.observed.commits,2);
  assert.equal(rows.latest.observed.pullRequests,1);
  assert.equal(rows.latest.observed.actionsRuns,1);
  assert.equal(rows.latest.observed.actionsMinutes,null);
  assert.equal(rows.latest.estimated.aiHours,null);
  assert.equal(rows.latest.estimated.electricityKwh,null);
  assert.deepEqual(rows.daily.map(x => [x.date,x.observed.commits]),[
    ['2026-11-09',1],['2026-11-10',1],
  ]);
});
test('different repositories can contain same SHA', () => {
  const result=summarize(['a','b'],[
    {repo:'a',sha:'x',date:'2026-11-10T00:00:00Z'},
    {repo:'b',sha:'x',date:'2026-11-10T00:00:00Z'},
  ],[],[],'2026-11-10','2026-11-10','2026-11-10T21:00:00Z');
  assert.equal(result.latest.observed.commits,2);
});

test('member snapshot cannot expose admin-only details or estimates', () => {
  const source = summarize(['a'],[{repo:'a',sha:'1',date:'2026-11-10T10:00:00Z'}],[],[],
    '2026-10-01','2026-11-10','2026-11-10T20:00:00Z').latest;
  source.privateToken = 'NEVER_EXPOSE';
  source.estimated.aiHours = 100;
  source.estimated.electricityKwh = {low:1,central:2,high:3};
  const publicDoc = publicSummary(source);
  assert.equal(publicDoc.privateToken, undefined);
  assert.equal(publicDoc.observed.commits, 1);
  assert.equal(publicDoc.estimated.aiHours, null);
  assert.equal(publicDoc.estimated.electricityKwh, null);
  assert.equal(publicDoc.observed.actionsMinutes, null);
});
