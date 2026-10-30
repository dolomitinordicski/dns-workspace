# DNS Identity emulator acceptance

This suite is isolated from production. Run `npm install`, `npm run test:identity:app`,
`npx playwright install chromium`, then `npm run test:identity` (Node 22 and Java 21).
The runner starts Auth and Firestore emulators on loopback and always selects
`demo-dns-identity`. No service account, production Firebase login, deployment,
canonical seed or production matrix is used. Do not run seeding manually against a
shared emulator: the dedicated demo database is cleared before each suite.

## Three separate layers

- Application: eight cases exercise the actual Workspace access functions; one
  additional safety test rejects production projects, missing emulator settings
  and remote hosts.
- Rules/integration: real email/password sign-in to Auth Emulator; the Firebase
  client SDK then executes identity queries and operational reads/writes against
  the unmodified upstream Firestore rules. Only fixture setup disables rules.
  Covers own/foreign memberships and accessGrants, policy get/list/edit, W/R/none,
  grant absence, cross-organization queries/mutations, DNS Admin and anonymous
  access. Orders cover create/read/update/delete; sales cover validated create,
  read, atomic revision archive/update and forbidden delete.
- Browser: seven Playwright Chromium cases use the real Workspace page, normal
  login form, Auth Emulator and Firestore Emulator. No mocked identity, intercepted
  successful API response, custom token or injected auth state is used. Covers
  organization selection/switching, tool visibility, foreign organization exclusion,
  expired grant filtering, logout, invalid password, missing/inactive profile.
  Remote browser traffic is blocked; static image/font/style requests are excluded
  from the assertion against unexpected remote application requests.

## Synthetic identities and matrix

All three organizations belong to `dns-test-area`; there are no real regions in
this emulator database. `dns-test-organisation` has W, the secondary organization R,
and the foreign organization none. Writer and reader have explicit grants and
memberships in W/R contexts (deliberately including write grants under R to prove
the policy cap). Outsider has memberships but no grants in W/R, and full grants
plus membership in the none context. Admin has the `dns-admin` profile role.
Additional synthetic accounts have an inactive or missing profile. No grants are
created by application code. The matrix exists only inside the demo emulator.

## Source provenance

`upstream/provenance.json` pins the exact shared-data commit and SHA-256 hashes of
`firestore.rules` and PR #224's virtual fixture. Snapshots are unchanged, normalized
as their Git LF blobs; `.gitattributes` preserves LF on Windows. The runner verifies
the hashes before testing. These snapshots are test inputs and are never deployed.
They do not prove that the currently published rules have identical bytes.

## Application correction

An existing policy without a Data Entry key previously displayed Data Entry if a
grant matched. Workspace now denies that visibility, matching the rules default
of none. An entirely absent policy retains the explicit legacy grant behavior.
The emulator connection is available only in dedicated `identity-e2e` development
mode on localhost/127.0.0.1, with hard-coded demo project and loopback endpoints.
Normal builds retain the existing production Firebase configuration.

## Acceptance limits / still to test

- KP entries, KP verification, pricing administration, order lines, deadlines and
  complete Data Entry UI interactions are outside this suite. In particular,
  upstream `hasKpPermission` and `managePricing` do not call the Data Entry matrix
  helper: matrix enforcement there must be assessed before claiming all Data Entry
  domains are accepted. This PR makes no production rule changes.
- Browser tests stop at Workspace visibility and context selection. They do not
  open externally hosted tools or verify their independent sessions/authorization.
- Google OAuth, real provider configuration, cross-origin SSO, actual published
  rules equivalence and production deployment are not exercised by emulators.
- DNS Admin matrix editing UI is not submitted; the existing production matrix is
  never fetched or overwritten.
- Chromium only; Firefox/WebKit and mobile behavior remain untested.

CI evidence and final counts are recorded in the PR description after execution.
No merge or deployment is performed by this work.
