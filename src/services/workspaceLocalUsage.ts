export type WorkspaceLocalUsage = Record<string, number>;

const STORAGE_KEY = 'dns-workspace-local-tool-usage-v1';
const EVENT_NAME = 'dns-workspace-local-usage';

export function readWorkspaceLocalUsage(): WorkspaceLocalUsage {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const value = JSON.parse(raw) as Record<string, unknown>;
    return Object.fromEntries(
      Object.entries(value).filter(([, count]) => typeof count === 'number' && Number.isFinite(count) && count >= 0)
    ) as WorkspaceLocalUsage;
  } catch {
    return {};
  }
}

export function recordWorkspaceToolOpen(toolId: string): void {
  if (!/^[a-z0-9-]+$/.test(toolId)) return;
  const usage = readWorkspaceLocalUsage();
  usage[toolId] = (usage[toolId] ?? 0) + 1;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(usage));
    window.dispatchEvent(new CustomEvent(EVENT_NAME));
  } catch {
    // Usage visualization is best-effort and must never block navigation.
  }
}

export function subscribeWorkspaceLocalUsage(listener: () => void): () => void {
  window.addEventListener(EVENT_NAME, listener);
  window.addEventListener('storage', listener);
  return () => {
    window.removeEventListener(EVENT_NAME, listener);
    window.removeEventListener('storage', listener);
  };
}
