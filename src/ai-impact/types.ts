/** Public snapshot contract (v1); collectors retain the full historical schema. */
export type ImpactRange = { low: number; central: number; high: number };

export type AIImpactSnapshot = {
  schemaVersion: 1;
  generatedAt: string;
  periodStart: string;
  periodEnd: string;
  observed: {
    repositories: number;
    commits: number;
    pullRequests: number;
    actionsMinutes: number | null;
    actionsRuns?: number;
    actionsElapsedHours?: number | null;
    actionsElapsedCoverage?: number | null;
  };
  estimated: {
    aiHours: number | null;
    humanEquivalentHours: number | null;
    electricityKwh: ImpactRange | null;
    waterLitres: ImpactRange | null;
  };
  environmentModel?: { label: string; modelId: string; benchmarkUrl?: string } | null;
  developmentActivity?: { sessions: number; estimateHours: ImpactRange; methodology: string } | null;
  methodologyUrl?: string;
};
export type ImpactLoadState = 'loading' | 'ready' | 'missing' | 'error';
