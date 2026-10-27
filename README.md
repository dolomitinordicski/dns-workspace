# DNS Workspace

Unified application shell for the Dolomiti NordicSki digital platform.

## W0 — clean bootstrap

DNS Workspace is intentionally developed in its own repository. Existing DNS tools remain autonomous applications with their own repositories, business logic, Firebase domains, releases and deployments.

The first workspace milestone provides:

- Vite + React + TypeScript + Tailwind
- immutable DNS Foundation dependency
- canonical DNS tool registry consumption
- radial application navigator
- DNS Core + Shared Data / Foundation as the central nucleus
- single click: select tool and open the technical drawer
- connected tools: highlighted from registry dependencies
- double click: open the existing standalone tool
- scalable two-ring layout for future tools
- GitHub Pages CI
- automatic Foundation update governance

## Architecture direction

The next milestone introduces a Workspace Shell Contract. Existing tools will become shell-aware without moving their domain engines into this repository.

```text
DNS Workspace
├── persistent shell / header
├── radial application switcher
├── auth + permissions
├── tool navigation manifest
└── workspace viewport
    ├── Analytics
    ├── Data Entry
    ├── FAIR
    ├── Faktura
    └── ...
```

Standalone tool URLs remain available for debugging, emergency access and gradual migration.

## DNS Digital Pass — deployment gate (pilot 2026/27)

The customer UI is **not live** on this branch. Firebase email-link sign-in is enabled in project `dns-core`, and the approved GitHub Pages redirect host is `dolomitinordicski.github.io`; the customer return route must be `https://dolomitinordicski.github.io/dns-workspace/#digital-pass`.

Before enabling the customer flow:

1. Merge and validate the upstream Digital Pass backend PRs, verify Firestore backup, inventory revision, privacy notice, authorized origins, HMAC secret, runtime identity and permissions, and deploy `digitalPassApi` to `europe-west8` only after review.
2. Set build-time `VITE_DNS_DIGITAL_PASS_API_BASE` to the **actual deployed HTTPS endpoint**, not a guessed Cloud Functions URL. Confirm that the function accepts POST routes including `/v1/pass-registrations/complete` and `/v1/me/digital-pass`. Configure backend `DNS_PASS_ALLOWED_ORIGINS` to allow the exact Workspace origin `https://dolomitinordicski.github.io`.
3. Set `VITE_DNS_DIGITAL_PASS_PRIVACY_URL` to the approved published DNS privacy notice. Confirm all three languages and consent recording. A configured backend alone does not authorize a public pilot.
4. Test email-link authentication (same-device and cross-device), pass registration, QR visibility, scanner authorization and revocation with disposable pilot assignments; then explicitly approve the production launch.
5. Keep Brevo marketing DOI disabled independently until its template/API flow is proven. Firebase service-login email is **not** Brevo marketing consent.

The app intentionally disables the registration form when the API base variable is missing. Never place server credentials or Firebase HMAC secrets in `VITE_*` variables, which are bundled into public JavaScript.
