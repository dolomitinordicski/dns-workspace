export const DNS_WORKSPACE_SHELL_PROTOCOL_VERSION = '0.1.0' as const;

export type DNSWorkspaceLanguage = 'de' | 'it';

export type DNSWorkspaceNavigationItem = {
  id: string;
  label: { de: string; it: string };
  route?: string;
  sectionId?: string;
};

export type DNSWorkspaceToolManifest = {
  id: string;
  label: string;
  version: string;
  navigation: readonly DNSWorkspaceNavigationItem[];
  capabilities?: readonly string[];
};

export type DNSWorkspaceHostMessage =
  | {
      type: 'dns-workspace:language';
      protocol: typeof DNS_WORKSPACE_SHELL_PROTOCOL_VERSION;
      language: DNSWorkspaceLanguage;
    }
  | {
      type: 'dns-workspace:navigate';
      protocol: typeof DNS_WORKSPACE_SHELL_PROTOCOL_VERSION;
      route?: string;
      sectionId?: string;
    }
  | {
      type: 'dns-workspace:request-state';
      protocol: typeof DNS_WORKSPACE_SHELL_PROTOCOL_VERSION;
    };

export type DNSWorkspaceToolMessage =
  | {
      type: 'dns-tool:ready';
      protocol: typeof DNS_WORKSPACE_SHELL_PROTOCOL_VERSION;
      manifest: DNSWorkspaceToolManifest;
    }
  | {
      type: 'dns-tool:navigation';
      protocol: typeof DNS_WORKSPACE_SHELL_PROTOCOL_VERSION;
      route?: string;
      sectionId?: string;
    }
  | {
      type: 'dns-tool:title';
      protocol: typeof DNS_WORKSPACE_SHELL_PROTOCOL_VERSION;
      label: string;
    };

export function isDNSWorkspaceToolMessage(value: unknown): value is DNSWorkspaceToolMessage {
  if (!value || typeof value !== 'object') return false;
  const message = value as Partial<DNSWorkspaceToolMessage>;
  return (
    message.protocol === DNS_WORKSPACE_SHELL_PROTOCOL_VERSION &&
    typeof message.type === 'string' &&
    ['dns-tool:ready', 'dns-tool:navigation', 'dns-tool:title'].includes(message.type)
  );
}

export function getDNSWorkspaceEmbedUrl(toolUrl: string): string {
  const url = new URL(toolUrl);
  url.searchParams.set('dns-shell', 'workspace');
  return url.toString();
}
