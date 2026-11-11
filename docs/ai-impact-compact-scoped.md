# DNS Ecosystem AI Impact — compact dashboard and scoped repository policy

The Workspace cockpit now displays **one** compact AI & Sustainability panel, using existing Workspace/Foundation classes and native meter/details elements. It combines two distinct metrics without equating them:

- The manually supplied **170 h central** human–AI collaboration estimate, with a preliminary range **120–220 h**, explicitly as-of **10 November 2026**. This does not automatically increase with GitHub commits. The 1 October–10 November period and provenance are in `src/data/ai-collaboration-preliminary.json`.
- Observed GitHub commits and PRs, updated by the existing collector. Developer-time heuristics and workflow elapsed hours are inside an optional collapsed details section, not mixed with verified time.
- Traditional-equivalent hours, time saved, energy and water remain **Da verificare / Zu überprüfen**. No numeric inference-energy scenarios are displayed.

## Future AI collaboration revisions

The original 170 h baseline must not be silently revised or multiplied by elapsed days. The versioned baseline contains `futureRevisions: []`. Each subsequent *motivated* estimate should be appended with a `periodEnd` and `collaborationHours: { low, central, high }`, plus provenance and methodology in the PR body. The UI displays the most recent revision and its as-of date. Do not modify GitHub collection values in order to change AI hours.

## Explicit repository scope

The collector now reads `config/ai-impact-repositories.json` rather than counting every repository owned by the account. The initial operational scope includes:

`dns-workspace`, `dns-shared-data`, `DNS-Data-Entry`, `DNS-Flyer-Studio`, `analytics`, `fairmodel`, `DNS-Faktura`, `DNS-Polls-tool`, `dns-partner-hub`, `partnerportal`, `hub`, `dns-wiki`.

Excluded for now as outside the core operational Workspace: `strategy`, `smartslopes`, `360ARtool`, `qrcodegen`. Reassess scope when those projects become part of the monitored operational Ecosystem. Scope is machine-readable and versioned. Counts produced after this change will differ from older 16-repository totals; **this is a scope change, not a decline in development**. It does not delete or rewrite GitHub history.

Repository count is no longer a headline KPI; the dashboard emphasizes human–AI collaboration and observed commits/PRs.

## Constraints

No new services, data collection providers, CSS framework, token set or Firestore schema introduced. No merge/deploy unless explicitly authorized. Test `tests/ai-impact-compact-scoped.test.mjs` guards the scope and compact UI.
