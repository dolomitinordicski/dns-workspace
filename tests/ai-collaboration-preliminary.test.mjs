import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const readBaseline = async () => JSON.parse(await readFile(new URL('../src/data/ai-collaboration-preliminary.json', import.meta.url), 'utf8'));

test('preliminary collaboration baseline has explicit unverified status and traceable period', async () => {
  const data = await readBaseline();
  assert.equal(data.schemaVersion, 1);
  assert.equal(data.status, 'preliminary_unverified');
  assert.equal(data.source, 'manual_preliminary_estimate');
  assert.equal(data.periodStart, '2026-10-01');
  assert.equal(data.periodEnd, '2026-11-10');
  assert.deepEqual(data.collaborationHours, {low:120, central:170, high:220});
  assert.equal(data.hoursPerWorkday, 8);
  assert.equal(Math.round(data.collaborationHours.central/data.hoursPerWorkday),21);
});

test('unverified baseline does not fabricate traditional development, savings, energy or water', async () => {
  const data = await readBaseline();
  for (const field of ['traditionalEquivalentHours','timeSavedHours','energyKwh','waterLitres']) {
    assert.equal(data[field], null, field);
  }
  assert.equal(data.chatgptExport.available, false);
  assert.equal(data.chatgptExport.importedAt, null);
});

test('baseline is independent from GitHub observations and scenario telemetry', async () => {
  const data = await readBaseline();
  assert.equal('commits' in data, false);
  assert.equal('pullRequests' in data, false);
  assert.equal('actionsMinutes' in data, false);
  assert.equal('environmentModel' in data, false);
});
