/**
 * Theme-only protocol between DNS Workspace and embedded DNS tools.
 * No identity, authorization, storage or navigation data is transmitted.
 */
export const DNS_THEME_MESSAGE_TYPE = 'dns:theme:v1' as const;
export type DNSThemePreference = 'system' | 'light' | 'dark';

export interface DNSThemeMessage {
  type: typeof DNS_THEME_MESSAGE_TYPE;
  preference: DNSThemePreference;
}

export function isDNSThemePreference(value: unknown): value is DNSThemePreference {
  return value === 'system' || value === 'light' || value === 'dark';
}

export function createDNSThemeMessage(preference: DNSThemePreference): DNSThemeMessage {
  return { type: DNS_THEME_MESSAGE_TYPE, preference };
}

/** Reject untrusted origins and unexpected message shapes before applying UI state. */
export function parseDNSThemeMessage(data: unknown, origin: string, expectedOrigin: string): DNSThemeMessage | null {
  if (origin !== expectedOrigin || !data || typeof data !== 'object' || Array.isArray(data)) return null;
  const message = data as Record<string, unknown>;
  if (message.type !== DNS_THEME_MESSAGE_TYPE || !isDNSThemePreference(message.preference)) return null;
  return createDNSThemeMessage(message.preference);
}

/** Same allowlist as embeddedUrl.ts; never derive targetOrigin from a wildcard. */
export function dnsToolThemeOrigin(rawUrl: string): string {
  const url = new URL(rawUrl);
  if (url.protocol !== 'https:' || url.hostname !== 'dolomitinordicski.github.io') {
    throw new Error('UNSUPPORTED_WORKSPACE_TOOL_ORIGIN');
  }
  return url.origin;
}
