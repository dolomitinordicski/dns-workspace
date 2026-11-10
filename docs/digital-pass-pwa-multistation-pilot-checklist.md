# DNS Digital Pass — pilot PWA and multi-station verification

This checklist is intentionally **read-only**: it does not modify Workspace, Identity, Firebase configuration, customer data or production passes. Run tests on an isolated staging backend with synthetic pass numbers.

## Baseline already in `main`

- `pass.html` is a separate public entry point, not an embedded staff page.
- `public/digital-pass.webmanifest` declares a standalone app whose `start_url` is `/dns-workspace/pass.html`.
- `public/digital-pass-sw.js` caches only public shell resources; it must never cache API responses or pass-holder data.
- `src/pass-standalone.ts` registers the service worker and offers a local offline copy of the pass.
- Operator authorization derives from the existing DNS Workspace staff Firebase session. No extra operator login should be introduced.

## Acceptance matrix (requires actual staging and devices)

| ID | Scenario | Required outcome |
| --- | --- | --- |
| M1 | Log in on two independent PCs/browsers as the same authorized organization account | Both sessions remain available; neither PC logs out the other |
| M2 | PC A prepares synthetic pass A while PC B prepares synthetic pass B | Distinct preparation IDs, codes and states; no cross-window interference |
| M3 | Both PCs try to prepare/confirm the **same** synthetic pass concurrently | Backend enforces a single valid sale/activation; no double issuance or duplicate attestation |
| M4 | A different organization's account accesses operator functions | Access denied by backend authorization, not just UI |
| M5 | Operator starts preparation, then loses network | No local confirmation; backend attestation remains authoritative |
| P1 | Android Chrome opens pass page and adds it to home screen | App opens at pass.html in standalone display with DNS branding |
| P2 | iPhone Safari uses Share → Add to Home Screen | Shortcut opens the correct customer page without requiring Apple Developer |
| P3 | Valid synthetic pass is saved offline and reopened without connectivity | Saved copy appears with explicit **offline/stale** indicator; no online validation claim |
| P4 | An offline pass is revoked or changed on the server | Next online check shows authoritative backend status; local copy never bypasses validation |
| P5 | Customer signs out, then reopens offline page | Locally saved pass data is cleared as expected |
| P6 | Test on both systems after deployment | No Workspace staff login, staff state or admin tool appears in the customer app |

## Release gate

- Execute the tests against **staging**, never with production pass numbers.
- Save the results and device/browser versions in the pilot report.
- A browser session test alone does **not** establish backend concurrency safety; M3 is mandatory.
- No merge or deploy without explicit authorization: `AUTORIZZO DEPLOY PR #…`.
- Do not modify the public pass page, service worker, Firebase rules, or main branch as part of this checklist PR.
