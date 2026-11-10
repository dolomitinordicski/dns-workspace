# DNS Ecosystem — preliminary human–AI collaboration baseline

This is an **independent, manually supplied and unverified estimate**, not derived from GitHub commits or GitHub Actions. It is presented in the Workspace dashboard for all authenticated organizations, immediately before the existing GitHub AI Impact Monitor.

## Baseline (01.10.2026 – 10.11.2026)

| Indicator | Value |
| --- | --- |
| Human–AI collaboration hours | 120–220 h |
| Central estimate | 170 h |
| Eight-hour workday equivalent | Approximately 21 working days (170/8, rounded) |
| Traditional development hours | Da determinare / Noch zu ermitteln |
| Time saving | Da determinare / Noch zu ermitteln |
| Energy | Da determinare / Noch zu ermitteln |
| Water | Da determinare / Noch zu ermitteln |

Mandatory prominent notice: **«Stime preliminari – dati non ancora verificati»** (DE: **«Vorläufige Schätzungen – Daten noch nicht verifiziert»**).

The estimate refers to **human–AI collaboration elapsed effort**, not an amount of AI inference time, not GitHub workflow time, and not a validated traditional-development equivalent. No time-saving or environmental benefits can be inferred from these hours alone. The separate GitHub panel may contain *experimental* inference-energy scenarios; these are **not** a measured or justified estimate of actual energy/water use for the collaboration baseline, which consequently stays `null`.

## Single source of baseline values

`src/data/ai-collaboration-preliminary.json`:

- `periodStart`, `periodEnd`: period covered by the supplied estimate.
- `collaborationHours.low/central/high`: input range; never overwritten by daily GitHub collection.
- `traditionalEquivalentHours`, `timeSavedHours`, `energyKwh`, `waterLitres`: `null` until independently validated.
- `status`: `preliminary_unverified`.
- `chatgptExport.available` and `chatgptExport.importedAt`: export provenance tracking.

Once ChatGPT conversation history has been exported and independently evaluated, update this JSON in a separately reviewed PR, document the estimating method, source window and limitations, and only then update status or populate additional fields. Changes to this baseline do not mutate GitHub facts, the collector, Firestore or any repository telemetry.

## Visual integration / operational constraints

- Component `src/components/WorkspaceAICollaboration.tsx` uses existing `workspace-dashboard-section`, `workspace-dashboard-heading`, `dns-kicker`, `workspace-kpi-grid`, `workspace-kpi` and `workspace-source-note` classes. These are already in Workspace and are fed by DNS Foundation tokens. No new CSS file, component library, visual token or inline color was introduced.
- Italian / German localized labels and copy.
- Shown in the authenticated Workspace cockpit for all organization roles.
- Existing GitHub observations displayed separately in `WorkspaceAIImpact`.
- Existing GitHub collector, GitHub data and environmental scenario model unchanged.
- No extra infrastructure, third-party service, runtime request or Firestore write.
- Automated validation of the baseline is attached to the existing Pages CI; merge and deploy require explicit release authorization.
