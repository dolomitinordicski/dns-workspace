import {
  initDNSFoundation,
  type DNSFoundationRuntimeHandle,
} from '@dolomitinordicski/dns-shared-data/foundation';
import { DNS_FOUNDATION_RELEASE_VERSION } from '@dolomitinordicski/dns-shared-data/release';

export type DNSWorkspaceLanguage = 'de' | 'it';

const foundationAssets =
  `https://raw.githubusercontent.com/dolomitinordicski/dns-shared-data/foundation-v${DNS_FOUNDATION_RELEASE_VERSION}/brand`;

export const DNS_WORKSPACE_FOUNDATION_VERSION = DNS_FOUNDATION_RELEASE_VERSION;
export const DNS_SHARED_WEB_LOGO_URL = `${foundationAssets}/logo-web.png`;

let foundation: DNSFoundationRuntimeHandle | null = null;

export function initDNSWorkspaceFoundation(language?: DNSWorkspaceLanguage) {
  if (!foundation) {
    foundation = initDNSFoundation({
      language,
      shellProfile: 'operational',
      print: false,
      footer: false,
      capabilities: [],
      accessibility: {
        enabled: true,
        mountSelector: '[data-dns-accessibility-mount]',
        storageKey: 'dns-accessibility-v1',
      },
    });
  } else if (language && foundation.getLanguage() !== language) {
    foundation.setLanguage(language);
  }

  return foundation;
}

export function getDNSWorkspaceLanguage(): DNSWorkspaceLanguage {
  return initDNSWorkspaceFoundation().getLanguage();
}

export function setDNSWorkspaceLanguage(language: DNSWorkspaceLanguage) {
  initDNSWorkspaceFoundation().setLanguage(language);
}

export function subscribeDNSWorkspaceLanguage(
  listener: (language: DNSWorkspaceLanguage) => void,
) {
  return initDNSWorkspaceFoundation().subscribeLanguage(listener);
}
