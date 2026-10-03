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
