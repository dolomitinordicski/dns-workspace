# Google access requests and administrator approval

The generic invitation is the Workspace URL with `?access=request`. It is a request link, not an authorization token. Forwarding it grants no access.

An applicant signs in with Google, chooses an active tourism organization and submits one immutable request. Authentication creates the Firebase Auth user; no DNS profile, membership or grant exists before approval. Organization names and other master references retain their existing public-read policy; operational data remains protected by the existing rules.

DNS Admin prepares the organization's tool matrix first, then reviews email, organization, area and saved W/R/– permissions in Workspace → Organizations & Access → Users. Approval checks the current Google account and creates a non-admin profile, organization membership, area-scoped grant and organization account assignment atomically. Rejection creates no entitlement. Refreshing request status and signing in again after approval are explicit; no real-time collaboration is introduced.

One account per organization is enforced with a transaction lock. Existing active memberships also block approval. Existing profiles/grants are never overwritten. Replacement, exceptions and re-opening rejected requests are deliberately manual administrative procedures outside this first flow. No invitation or notification email is sent: the administrator shares the generic link and checks the queue.

The protected `dnsWorkspaceAccess` callable is deployed as a separate `workspace-access` Functions codebase in europe-west8. All access-request/assignment documents remain closed to direct client Firestore access under the existing default-deny rules. Only the callable exposes the applicant's own request or the DNS Admin queue. There are no changes to Firestore rules and no overlap with Shared Data #221/#231/#232.

Approval derives domain grants from the saved matrix, never from applicant input. Data Entry W includes entry writes, R excludes writes. Flyer W grants read/write, R only read, – neither. Analytics grants seasonal reads. Faktura read grants verification.read, write adds sales/order verification; Polls read/write maps to the existing scoped permissions. FAIR and Partner Hub have no additional domain permissions in this contract and retain their existing application access requirements. No publish, pricing.manage, season.manage or global administrative permissions are issued.

Matrix changes in this interface go through the protected service and also reconcile grants created by this flow. Unmanaged legacy grants are not rewritten. Editing authorization documents directly in the console is outside this reconciliation contract.

## Isolated validation

Use Node 22, Java 21, `npm install`, `npm ci --prefix server`, and Firebase CLI 15.34.2 for the new Functions v7 codebase. The older Identity suite retains its existing CLI. Run:

```
npx --yes firebase-tools@15.34.2 emulators:exec --config firebase.access.json --only auth,firestore,functions --project demo-dns-identity "node --test --test-concurrency=1 server/tests/*.test.mjs && npx playwright test --config playwright.identity.config.ts"
```

Set GCLOUD_PROJECT=demo-dns-identity, FIRESTORE_EMULATOR_HOST=127.0.0.1:8188, FIREBASE_AUTH_EMULATOR_HOST=127.0.0.1:9199 and DNS_ACCESS_ACCEPTANCE=true. Tests refuse other projects/hosts. The service tests exercise real Firestore transactions with an explicit Auth metadata adapter; the callable test uses real Auth Emulator Google tokens, Functions and Firestore rules. Browser tests exercise Google popup login, request submission, administrator approval, permission preview, status refresh and approved Workspace login. These do not certify a production Google OAuth/domain configuration.

The Google popup test permits the Firebase SDK's static script download from apis.google.com. Auth, Firestore and Functions requests remain on loopback demo emulators; remote authentication/data requests are blocked.

## Release gate

No deploy workflow is added. `firebase.access.json` is a manual deployment/test configuration, not production approval. Before release: review the PR, pass CI, verify the Functions runtime identity and minimum required Auth-read/Firestore permissions, confirm the production authorized domain for Google, then obtain explicit deployment approval. Deploy only the workspace-access Functions codebase; do not publish the test rules or emulator configuration to production. The new UI requires that backend before activation. Existing client matrix saves now require this service, so UI/backend rollout must be coordinated. Keep the current production UI until both are approved.

No existing Auth user/provider is changed, no Google credential is managed by this feature, and no production data is seeded or migrated.
