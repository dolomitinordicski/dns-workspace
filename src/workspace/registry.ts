import {
  DNS_TOOL_REGISTRY,
  DNS_TOOL_REGISTRY_CANONICAL,
  type DNSToolRegistryEntry,
} from '@dolomitinordicski/dns-shared-data/tool-registry';

export type WorkspaceTool = DNSToolRegistryEntry;

export const workspaceCanonical = DNS_TOOL_REGISTRY_CANONICAL;

const ACTIVE_TOOL_IDS = new Set([ 'dns-core', 'shared-data', 'hub', 'workspace', 'data-entry', 'analytics', 'fair', 'faktura', 'polls', 'flyer-studio', 'partner-hub' ]);

const activeRegistry = DNS_TOOL_REGISTRY.filter((tool) => ACTIVE_TOOL_IDS.has(tool.id));

export const platformTools = activeRegistry.filter(
  (tool) => tool.visible && tool.group === 'platform',
);

export const workspaceTools = activeRegistry.filter(
  (tool) => tool.visible && tool.group !== 'platform',
);

export function getTool(id: string): WorkspaceTool | undefined {
  return activeRegistry.find((tool) => tool.id === id);
}

export function getConnectedToolIds(id: string): Set<string> {
  const selected = getTool(id);
  if (!selected) return new Set();

  const ids = new Set<string>([id]);

  for (const dependency of selected.dependencies) {
    if (dependency !== 'dns-core' && dependency !== 'shared-data') {
      ids.add(dependency);
    }
  }

  for (const tool of activeRegistry) {
    if (tool.dependencies.includes(id)) {
      ids.add(tool.id);
    }
  }

  return ids;
}

export function getDownstreamTools(id: string): WorkspaceTool[] {
  return workspaceTools.filter((tool) => tool.dependencies.includes(id));
}
