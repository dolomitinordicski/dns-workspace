# DNS Digital Pass — QR handoff contract (PR #60)

The operator dashboard now provides an inline QR workflow; customer scanning opens the public page with pass number and fallback code prefilled. The customer URL fragment is cleared on load. The UI polls a staff-authenticated server status endpoint and only displays confirmed after a server response of SOLD_ATTESTED.

**Backend dependency (not yet verified or implemented):** POST /v1/pass-activations/status with physicalPassId and preparationId, returning PENDING/PREPARED/SOLD_ATTESTED/EXPIRED/CANCELLED. Current prepare/validate backend contract does not guarantee a sale from a QR scan. The server must atomically confirm the sale on a validated, one-time customer claim event after the operator's authenticated preparation. A camera scan by itself is not observable or sufficient.

Before launch: enforce organization/outlet scope, expiration, one-time use, replay/rate-limit protection, idempotency, anti-CSRF where relevant, no secret logging, restricted CORS, audit operator/outlet/time, and e2e emulator tests. Customer email verification and marketing consent remain separate. No production deployment or feature activation is included in this PR.
