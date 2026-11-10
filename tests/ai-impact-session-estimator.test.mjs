import test from 'node:test';
import assert from 'node:assert/strict';
import { estimateDevelopmentSessions } from '../scripts/ai-impact-session-estimator.mjs';

test('joins nearby cross-repository commits in a single session', () => {
  const x = estimateDevelopmentSessions([
    {repo:'a',date:'2026-11-10T08:00:00Z'},
    {repo:'b',date:'2026-11-10T08:30:00Z'},
    {repo:'a',date:'2026-11-10T11:00:00Z'},
  ]);
  assert.equal(x.sessions,2);
  assert.deepEqual(x.estimateHours, {low:0.3,central:0.9,high:1.5});
});
test('does not interpret missing timestamps as zero hours worked', () => {
  const x = estimateDevelopmentSessions([]);
  assert.equal(x.sessions,0);
});
test('session estimates do not become AI inference hours', () => {
  const x=estimateDevelopmentSessions([{date:'2026-11-10T08:00:00Z'}]);
  assert.equal(x.estimateHours.central,0.3);
  assert.equal(x.aiHours,undefined);
});
