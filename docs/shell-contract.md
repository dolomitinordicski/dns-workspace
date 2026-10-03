# DNS Workspace Shell Contract — W1

The Workspace shell protocol allows existing DNS tools to remain autonomous while being hosted inside DNS Workspace.

## Goals

- keep every tool in its existing repository;
- keep business/domain engines unchanged;
- keep standalone URLs operational;
- allow DNS Workspace to own the persistent global header and application switching;
- allow the active tool to declare its own local navigation;
- synchronize language and navigation without coupling repositories;
- provide a safe path toward centralized authentication and permissions.

## Embed mode

Workspace hosts a tool with:

```
?dns-shell=workspace
```

The embedded tool can then suppress duplicate global chrome while preserving its own application content.

## W1 protocol

The host sends:

- `dns-workspace:language`
- `dns-workspace:navigate`
- `dns-workspace:request-state`

The tool sends:

- `dns-tool:ready` with its manifest and local navigation;
- `dns-tool:navigation` when its internal route/section changes;
- `dns-tool:title` when the shell title should change.

All messages carry an explicit protocol version and are accepted only from the expected iframe origin.

## Security boundary

This protocol is navigation/UI coordination only. It is not an authorization mechanism.

Firestore rules, Functions and application backends remain responsible for actual access control.

## Migration

W1 is implemented and validated inside DNS Workspace first. After one consumer pilot succeeds, the consumer-side adapter can be promoted into DNS Foundation and propagated without changing tool engines.
