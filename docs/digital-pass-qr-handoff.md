# DNS Digital Pass — QR handoff contract

The operator dashboard provides an inline QR workflow. Customer scanning opens the public page with pass number and fallback code prefilled; the URL fragment is cleared on load. Operator prepare/status requests reuse identityAuth.currentUser and its existing Firebase token. There is no second operator login.

## Implemented backend contract
Shared Data PR #273 is merged and implements:
- POST /v1/pass-activations/prepare: authenticated operator with organization-scoped passActivation.issue and passSale.attest.
- POST /v1/pass-activations/claim: verified customer email binds the prepared sale atomically to that holder. A camera scan alone does not confirm a sale.
- POST /v1/pass-activations/status: original operator, matching physicalPassId and preparationId; dashboard confirms only SOLD_ATTESTED.
- POST /v1/pass-registrations/complete: optional later credential creation, separate from marketing consent.

Source integration does not prove cloud deployment or frontend connectivity. Verify the deployed endpoint, CORS, Firebase project/Auth domains, approved inventory revision, operator grants, HMAC access, privacy, rules, backups and audit before a real test.

## Controlled real-card acceptance
Workspace PR #63 adds a manual Pages pilot build gate. Ordinary builds disable activation and omit the API base. It requires digital_pass_pilot=true, DNS_PASS_PILOT_APPROVED=true, DNS_PASS_API_BASE and DNS_PASS_PRIVACY_URL. The generated public settings are VITE_DNS_DIGITAL_PASS_API_BASE, VITE_DNS_PASS_ACTIVATION_ENABLED and VITE_DNS_DIGITAL_PASS_PRIVACY_URL. Never put HMAC or server secrets in them.

Shared Data [PR #274](https://github.com/dolomitinordicski/dns-shared-data/pull/274) proposes an additional server-side single-organization/card/operator window, capped at four hours, and separate sale-claim/optional-registration switches. It is not merged or deployed. The frontend gate alone does not restrict backend use to one card.

The C3.1 staging export remains private and synthetic-only; do not bypass its guards for a real card. A narrowly controlled DNS Core test requires completed cloud verification and explicit release approval. The default season starts 15 November 2026; on 10 November a credential with those dates does not validate yet.

Read the dated [backend operational runbook](https://github.com/dolomitinordicski/dns-shared-data/blob/codex/digital-pass-controlled-real-pilot/docs/digital-pass-real-pilot-2026-11-10.md) for blockers, required configuration, real-device checks and shutdown sequence. During the 10 November audit, Firebase/GCP consoles were blocked by mandatory MFA; actual cloud resources could not be verified.

Before launch, verify expiry, one-time use, replay/rate limits, idempotency, no secret logging, restricted CORS, organization-scoped operator audit and emulator results. Email verification and marketing consent remain separate. No merge, production deployment, inventory change or activation is included here.
