import { collection, getDocs, getFirestore } from 'firebase/firestore';
import { passAuth } from '../services/digitalPassApi';
import {
  DNS_TOOL_REGISTRY,
  DNS_TOOL_REGISTRY_CANONICAL,
  type DNSToolRegistryEntry,
} from '@dolomitinordicski/dns-shared-data/tool-registry';

export type WorkspaceTool = DNSToolRegistryEntry;

export const workspaceCanonical = DNS_TOOL_REGISTRY_CANONICAL;

const ACTIVE_TOOL_IDS = new Set([ 'dns-core', 'shared-data', 'hub', 'workspace', 'data-entry', 'analytics', 'fair', 'faktura', 'polls', 'flyer-studio', 'partner-hub' ]);

const activeRegistry: WorkspaceTool[] = DNS_TOOL_REGISTRY.filter((tool) => ACTIVE_TOOL_IDS.has(tool.id));

export const platformTools = activeRegistry.filter(
  (tool) => tool.visible && tool.group === 'platform',
);

export const workspaceTools = activeRegistry.filter(
  (tool) => tool.visible && (tool.group !== 'platform' || tool.id === 'hub'),
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

const listeners = new Set<() => void>();
let revision = 0;
export function subscribeToolRegistry(listener: () => void): () => void {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}
export function getToolRegistryRevision(): number { return revision; }
function validTool(value: unknown): value is WorkspaceTool {
  if (!value || typeof value !== 'object') return false;
  const t = value as Record<string, unknown>;
  const description = t.description as Record<string, unknown> | undefined;
  const backend = t.backend as Record<string, unknown> | undefined;
  return typeof t.id === 'string' && ACTIVE_TOOL_IDS.has(t.id)
    && typeof t.repo === 'string' && t.repo.startsWith('dolomitinordicski/')
    && typeof t.label === 'string' && typeof t.url === 'string'
    && t.url.startsWith('https://dolomitinordicski.github.io/')
    && typeof t.group === 'string' && typeof t.lifecycle === 'string'
    && typeof t.visible === 'boolean'
    && typeof description?.it === 'string' && typeof description?.de === 'string'
    && typeof backend?.kind === 'string' && typeof backend?.label === 'string'
    && Array.isArray(t.dependencies) && t.dependencies.every(d => typeof d === 'string');
}
export async function refreshToolRegistry(): Promise<void> {
  try {
    const snapshot = await getDocs(collection(getFirestore(passAuth.app), 'toolRegistryPublic'));
    const rows = snapshot.docs.filter(doc => doc.id !== '_meta').map(doc => doc.data());
    const validated = rows.filter(validTool);
    if (validated.length !== rows.length || !validated.length ||
        new Set(validated.map(tool => tool.id)).size !== validated.length) {
      throw new Error('INVALID_DNS_TOOL_REGISTRY');
    }
    activeRegistry.splice(0, activeRegistry.length, ...validated);
    platformTools.splice(0, platformTools.length,
      ...validated.filter(tool => tool.visible && tool.group === 'platform'));
    workspaceTools.splice(0, workspaceTools.length,
      ...validated.filter(tool => tool.visible && (tool.group !== 'platform' || tool.id === 'hub')));
    revision++;
    listeners.forEach(listener => listener());
  } catch (error) {
    console.warn('DNS Workspace: tool registry fallback', error);
  }
}
