import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('dashboard masks environmental numbers in both languages', async () => {
  const component = await readFile(new URL('../src/components/WorkspaceAIImpact.tsx', import.meta.url), 'utf8');
  assert.match(component, /'Da verificare'/);
  assert.match(component, /'Zu überprüfen'/);
  assert.doesNotMatch(component, /snapshot\?\.estimated\.(electricityKwh|waterLitres)/);
  assert.doesNotMatch(component, /range\(snapshot\?\.estimated/);
});

test('preliminary AI collaboration baseline keeps unknown energy and water', async () => {
  const data = JSON.parse(await readFile(new URL('../src/data/ai-collaboration-preliminary.json', import.meta.url), 'utf8'));
  assert.equal(data.energyKwh, null);
  assert.equal(data.waterLitres, null);
});
