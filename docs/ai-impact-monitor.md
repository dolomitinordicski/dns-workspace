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

## Daily collector implementation (phase 2)

Workflow: `.github/workflows/ai-impact-daily.yml`, scheduled daily at **05:17 UTC** (plus manual workflow_dispatch).
Source: `scripts/ai-impact-collector.mjs`. GitHub Actions checks out the code, runs unit tests, then collects owner repositories, commits from the default branch, PRs by creation date, and workflow-run counts. Each invocation reconstructs the period and idempotently updates `day-YYYY-MM-DD` and `latest`. GitHub may retain only limited workflow history; this is an incomplete historical data source.

### Activation prerequisites — mandatory

1. Create a dedicated Google Cloud service account for the collector with **only** the Firestore write permissions required for `dns-core`, preferably a resource-scoped/custom role where supported. No service-account JSON keys.
2. Configure GitHub OIDC → Google Workload Identity Federation trust restricted to the canonical DNS Workspace repository, default branch and approved `dns-ai-impact-collector` GitHub environment.
3. Set GitHub **environment variables** `DNS_AI_IMPACT_WIF_PROVIDER`, `DNS_AI_IMPACT_SERVICE_ACCOUNT` and `DNS_AI_IMPACT_PUBLISH_ENABLED=true` after verification. Optional `DNS_AI_IMPACT_START` defaults to `2026-10-01` as a **provisional cutoff** only; replace with independently verified Foundation milestone before claiming whole-project historical coverage.
4. In the actual **dns-core Firestore rules source of truth**, allow reads of `adminAiImpactSnapshots/{id}` only for authenticated DNS Admin principals as defined by existing DNS Identity rules. Ensure ordinary area users cannot read, list or write the collection, and client writes are always denied. This repository does not own or deploy those rules.
5. Run manual `workflow_dispatch` with `publish=false` first; verify the generated snapshot artifact, cutoff and source counts; then enable publishing. Never add WIF tokens/keys to the frontend.
6. Verify that Workspace Admin can read `latest`, non-admin cannot, daily snapshots have the expected provenance, and latest timestamp advances between days.

### Methodological constraints

- Counts of GitHub commits/PRs/runs are observed activity, not AI hours.
- `actionsMinutes: null` is intentional: count of runs does not establish actual billed minutes.
- All AI hours, human equivalents, electricity and water remain `null` until an auditable workload dataset and approved conversion methodology exist.
- The admin dashboard's refresh button reloads Firestore; it does **not** manually start this job. Manual collection is available via GitHub Actions.
- A successful workflow run in dry-run mode does **not** prove that Firestore publishing is configured.
- No anonymous/public access to these metrics is required.


## Two visibility tiers — member summary versus DNS Admin (2026-11-10)

**Member dashboard (all authenticated organizations):** the same AI & Sustainability section renders from `memberAiImpactSnapshots/latest`. It shows only total repository, commit and PR counts; no costs, staff hours, provider/model identity, detailed runs, or unpublished environmental estimates. These are aggregate ecosystem statistics, not measurements of individual organizations' contributions.

**DNS Admin dashboard:** reads `adminAiImpactSnapshots/latest` with detailed observed activity and explicit, currently unavailable estimated measures. Do not treat UI conditional display as a security barrier.

The collector uses `publicSummary()` as an explicit field allowlist and writes two distinct documents. It must **never** clone the admin payload into the member document.

### Security deployment blocker

Before enabling publication, the owner of the real `dns-core` Firestore rules must add least-privilege rules:

- `adminAiImpactSnapshots/{documentId}`: get/list only DNS Admin per the existing verified identity contract; no client writes.
- `memberAiImpactSnapshots/latest`: get only to a signed-in, ACTIVE DNS Workspace organization member or DNS Admin; no list and no client writes. No access to arbitrary document IDs.
- Read access for both collections must be tested with active admin, active member and unauthenticated accounts. Do **not** set `allow read: if true`.
- Service account uses server-side IAM write access. A Firestore SDK client should never receive server credentials.
- If rules are not implemented, both dashboard panels must remain unavailable; this is safer than making privileged data public.

### Product communication

Use explanatory copy instead of a raw engineering dashboard: GitHub statistics are evidence of development activity, not a proxy for AI hours. Publish water, electricity and hours only after a defensible methodology and verified source telemetry, using uncertainty ranges. Provide an accessible bilingual DE/IT explanation.
