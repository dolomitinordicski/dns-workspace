import {
  DNS_TOOL_REGISTRY,
  DNS_TOOL_REGISTRY_CANONICAL,
  type DNSToolRegistryEntry,
} from '@dolomitinordicski/dns-shared-data/tool-registry';

export type WorkspaceTool = DNSToolRegistryEntry;

export const workspaceCanonical = DNS_TOOL_REGISTRY_CANONICAL;

export const platformTools = DNS_TOOL_REGISTRY.filter(
  (tool) => tool.visible && tool.group === 'platform',
);

export const workspaceTools = DNS_TOOL_REGISTRY.filter(
  (tool) => tool.visible && tool.group !== 'platform',
);

export function getTool(id: string): WorkspaceTool | undefined {
  return DNS_TOOL_REGISTRY.find((tool) => tool.id === id);
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

  for (const tool of DNS_TOOL_REGISTRY) {
    if (tool.dependencies.includes(id)) {
      ids.add(tool.id);
    }
  }

  return ids;
}

export function getDownstreamTools(id: string): WorkspaceTool[] {
  return workspaceTools.filter((tool) => tool.dependencies.includes(id));
}
