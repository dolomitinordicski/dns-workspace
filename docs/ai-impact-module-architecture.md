# AI Impact module — architecture and cleanup

The DNS Workspace cockpit is a composition root. Growing features belong in dedicated modules rather than in `WorkspaceCockpit.tsx`.

```
src/components/WorkspaceCockpit.tsx
  └── WorkspaceAIImpact.tsx        # presentation only
        ├── src/ai-impact/useAIImpactSnapshot.ts # React state + refresh
        │     └── src/ai-impact/service.ts       # Firestore/public snapshot loading and schema validation
        │           └── src/ai-impact/types.ts   # v1 typed contract
        └── src/ai-impact/collaboration.ts       # dated manual estimate
              └── src/data/ai-collaboration-preliminary.json
```

## Removed
- Unmounted, duplicated `src/components/WorkspaceAICollaboration.tsx`. It was replaced in PR #79 and no longer imported.
- Firestore, schema validation and asynchronous load-state implementation from the UI TSX.
- Outdated documentation stating that two AI panels were mounted.

## Preserved deliberately
- The AI collector, its workflow, repository scope, scenario calculation utilities and tests. They are still imported by the collector or validate historic reports and must **not** be removed merely because environmental values are hidden on screen.
- Firebase, React, DNS Foundation and other application-wide dependencies: this refactoring does **not** remove a package used elsewhere in Workspace.
- Snapshot fallback order: private Admin Firestore → public summary; public summary → member Firestore for non-Admins. No permissions or schemas changed.
- Baseline value 170 h, date 10.11.2026, dated future revisions, metrics and the `Da verificare` labels.
- Existing UI classes and Foundation tokens; no new style rules or components.

CI: existing TypeScript/Vite build, original AI tests, and `tests/ai-impact-modularity.test.mjs`. Deployment is gated independently; PR validation never deploys.
