# DNS Digital Pass: controlled physical-pass pilot readiness

## Auth: no second operator login

The Workspace operator component already reuses `identityAuth.currentUser` from the signed-in Workspace session. Its backend uses a **separate, server-enforced** permission projection. DNS admins are privileged automatically; other users require an active organization membership and an authorization grant for `passActivation.issue` **and** `passSale.attest`. Login alone does not silently grant permission to attest sales. Do not grant these to every authenticated Workspace user.

## Cloud limitation

The C3.1 staging export `server/firebase-staging-entry.mjs` is **private** and strictly **synthetic**. Its server verifies a pinned synthetic inventory and rejects real passes or the `dns-core` production project. A public GitHub Pages frontend cannot call its private Cloud Run invoker with a normal staff Firebase ID token.

For a **real** DNS 2026/27 pass, prepare a separately authorized pilot on the production DNS Core service or a purpose-built isolated environment with trusted real inventory and compatible Firebase Auth. No cloud project, IAM, secrets, Firestore writes or deploy were made by this PR.

## Controlled release

Ordinary GitHub Pages pushes continue to build with Digital Pass disabled. A future **manual** workflow dispatch can set `digital_pass_pilot=true` only when repo variables `DNS_PASS_PILOT_APPROVED=true`, `DNS_PASS_API_BASE`, and `DNS_PASS_PRIVACY_URL` have been approved and configured. This is a technical gate, **not** a substitute for the user-specific authorization phrase for merge, cloud deploy, IAM, inventory or public activation.

Before manual activation verify:
- Actual deployed HTTPS `digitalPassApi` and server routes for prepare/claim/status/register
- Dedicated service account IAM, HMAC secret, origin allowlist and verified email redirect
- Snapshot/revision of approved 2026/27 real numbered DNS seasonal-pass inventory (verify selected test pass belongs to one scope)
- Server-side organization permission policy, audit trail and backup/rollback
- Validity dates and enabled customer registration; marketing consent remains optional
- Real mobile camera / same-device / different-device email sign-in acceptance
- Reuse, expiry, duplicate claims, revocation, server failures and end-of-test kill switch

Never configure live card data in the synthetic staging inventory. Keep the public activation flag disabled until controlled sign-off.
