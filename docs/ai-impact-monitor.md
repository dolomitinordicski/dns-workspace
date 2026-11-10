# DNS AI Impact Monitor — v0 dashboard contract

Status: first read-only Workspace integration; **no collector, scheduled sync or production data has been deployed**.

## Scope and access

- DNS Workspace cockpit, DNS admin only (client view guard).
- Source: identity Firestore document `adminAiImpactSnapshots/latest`.
- Firestore rules **must enforce DNS admin read permissions** before any real data is written. Client-side visibility alone is not an access-control boundary.
- No credentials or GitHub PAT stored in browser. No write from Workspace.
- The **Aggiorna vista** button re-reads the stored snapshot; it does not trigger a GitHub refresh.

## Schema version 1

```json
{
  "schemaVersion": 1,
  "generatedAt": "2026-11-10T20:00:00Z",
  "periodStart": "2026-10-01",
  "periodEnd": "2026-11-10",
  "observed": {
    "repositories": 0,
    "commits": 0,
    "pullRequests": 0,
    "actionsMinutes": 0
  },
  "estimated": {
    "aiHours": null,
    "humanEquivalentHours": null,
    "electricityKwh": null,
    "waterLitres": null
  },
  "methodologyUrl": "https://github.com/dolomitinordicski/dns-workspace"
}
```

**The JSON above is a schema example, NOT real usage data. Do not publish it as an observed snapshot.** Null means not estimable, not zero. The environmental ranges, when computed, have `{ "low": number, "central": number, "high": number }` in kWh or litres. UI shows empty rather than invented values.

## Collector next PR

1. Audit all ecosystem repositories and establish a reproducible cutoff milestone for the Foundation/Shared Data decision. Do not infer the exact project start from a single repository's oldest searchable commit.
2. Run server-side GitHub API pagination using a least-privilege token; persist per-repo last cursor/checkpoint plus immutable event identity and ingestion provenance.
3. Deduplicate commits across merge PRs, forks and repeated syncs. Store GitHub Actions run durations separately from human/AI hours.
4. Generate immutable daily observed aggregates, then `latest` snapshot. Backfill first, then scheduled daily updates and manual server-side refresh via authenticated admin endpoint.
5. Human equivalence must be scenario-based using task classifications and review time, not lines of code or time between adjacent commits.
6. AI energy/water require separately documented model, region, inference/workload assumptions and uncertainty bounds; do not label a model estimate measured.
7. Validate Firebase security rules, access for a non-admin account, stale-data UI, invalid schema handling, CI, and end-to-end read-only behavior prior to any deployment.

## Deployment gate

This branch does not change Firestore rules, billing, Firebase functions, IAM or production infrastructure. Do not merge or deploy until explicit approval under DNS release governance.
