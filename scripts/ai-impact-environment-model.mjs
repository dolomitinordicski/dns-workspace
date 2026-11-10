/**
 * Exploratory environmental SCENARIOS. NOT measured or calibrated to DNS AI usage.
 * Assumed equivalent inference operations per GitHub-observed development session.
 * Benchmark lower-bound energy 0.24 Wh is from Google's Gemini median text request
 * (2025), not a measurement for Codex/ChatGPT or agentic workloads.
 * Direct cooling-water intensity is modeled separately from electricity generation.
 */
export const MODEL_ID = 'ai-inference-exploratory-v1';
export const ASSUMPTIONS = Object.freeze({
  low: { operationsPerSession: 2, whPerOperation: 0.24, coolingWaterLitresPerKwh: 0.2 },
  central: { operationsPerSession: 8, whPerOperation: 3, coolingWaterLitresPerKwh: 1.1 },
  high: { operationsPerSession: 25, whPerOperation: 20, coolingWaterLitresPerKwh: 3 },
});
const rounded = n => Math.round(n * 1000) / 1000;
export function modelEnvironmentalScenarios(sessions) {
  if (!Number.isInteger(sessions) || sessions < 0) throw Error('INVALID_SESSION_COUNT');
  const electricityKwh = {}, waterLitres = {};
  for (const level of ['low','central','high']) {
    const {operationsPerSession,whPerOperation,coolingWaterLitresPerKwh} = ASSUMPTIONS[level];
    const kwh = sessions * operationsPerSession * whPerOperation / 1000;
    electricityKwh[level] = rounded(kwh);
    waterLitres[level] = rounded(kwh * coolingWaterLitresPerKwh);
  }
  return {
    electricityKwh, waterLitres,
    modelId: MODEL_ID,
    label: 'exploratory_scenario_not_measured',
    boundaries: 'estimated AI inference electricity and on-site cooling water only; excludes end-user PCs, GitHub Actions and electricity-generation water',
    assumptions: ASSUMPTIONS,
    benchmarkUrl: 'https://services.google.com/fh/files/misc/measuring_the_environmental_impact_of_delivering_ai_at_google_scale.pdf',
  };
}
