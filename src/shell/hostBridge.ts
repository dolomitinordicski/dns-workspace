import {
  DNS_WORKSPACE_SHELL_PROTOCOL_VERSION,
  isDNSWorkspaceToolMessage,
  type DNSWorkspaceHostMessage,
  type DNSWorkspaceToolManifest,
  type DNSWorkspaceToolMessage,
} from './contract';

export type DNSWorkspaceHostState = {
  ready: boolean;
  manifest: DNSWorkspaceToolManifest | null;
  route?: string;
  sectionId?: string;
};

export type DNSWorkspaceHostBridge = {
  getState(): DNSWorkspaceHostState;
  send(message: DNSWorkspaceHostMessage): void;
  subscribe(listener: (message: DNSWorkspaceToolMessage, state: DNSWorkspaceHostState) => void): () => void;
  disconnect(): void;
};

export function createDNSWorkspaceHostBridge(
  frame: HTMLIFrameElement,
  expectedOrigin: string,
): DNSWorkspaceHostBridge {
  let state: DNSWorkspaceHostState = {
    ready: false,
    manifest: null,
  };

  const listeners = new Set<
    (message: DNSWorkspaceToolMessage, state: DNSWorkspaceHostState) => void
  >();

  const handleMessage = (event: MessageEvent) => {
    if (event.source !== frame.contentWindow) return;
    if (event.origin !== expectedOrigin) return;
    if (!isDNSWorkspaceToolMessage(event.data)) return;

    const message = event.data;

    if (message.type === 'dns-tool:ready') {
      state = {
        ...state,
        ready: true,
        manifest: message.manifest,
      };
    }

    if (message.type === 'dns-tool:navigation') {
      state = {
        ...state,
        route: message.route,
        sectionId: message.sectionId,
      };
    }

    listeners.forEach((listener) => listener(message, state));
  };

  window.addEventListener('message', handleMessage);

  return {
    getState() {
      return state;
    },
    send(message) {
      frame.contentWindow?.postMessage(message, expectedOrigin);
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    disconnect() {
      window.removeEventListener('message', handleMessage);
      listeners.clear();
      state = {
        ready: false,
        manifest: null,
      };
    },
  };
}

export function createWorkspaceMessage<T extends DNSWorkspaceHostMessage>(
  message: Omit<T, 'protocol'>,
): T {
  return {
    ...message,
    protocol: DNS_WORKSPACE_SHELL_PROTOCOL_VERSION,
  } as T;
}
