import test from 'node:test';
import assert from 'node:assert/strict';
import { modelEnvironmentalScenarios } from '../scripts/ai-impact-environment-model.mjs';
import { publicSummary } from '../scripts/ai-impact-collector.mjs';

test('water and energy scenarios are explicit and monotonic', () => {
  const x=modelEnvironmentalScenarios(100);
  assert.deepEqual(x.electricityKwh,{low:0.048,central:2.4,high:50});
  assert.deepEqual(x.waterLitres,{low:0.01,central:2.64,high:150});
  assert.match(x.label,/not_measured/);
  assert.ok(x.assumptions.central.whPerOperation);
});
test('published data includes scenarios and their limitations, not AI hours',()=>{
  const m=modelEnvironmentalScenarios(3);
  const source={schemaVersion:1,generatedAt:'2026-11-11T00:00:00Z',periodStart:'2026-10-01',
    periodEnd:'2026-11-11',observed:{repositories:2,commits:10,pullRequests:5},estimated:{
      aiHours:null,humanEquivalentHours:null,electricityKwh:m.electricityKwh,waterLitres:m.waterLitres},
    environmentModel:m};
  const visible=publicSummary(source);
  assert.equal(visible.estimated.aiHours,null);
  assert.equal(visible.environmentModel.label,'exploratory_scenario_not_measured');
  assert.equal(visible.estimated.electricityKwh.central,m.electricityKwh.central);
});
test('rejects invalid negative sessions',()=>assert.throws(()=>modelEnvironmentalScenarios(-1)));
