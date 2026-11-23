import type { DNSIdentity } from '../services/dnsIdentity';

/** Only the active global profile role grants DNS Admin UI access. */
export function isDNSAdmin(identity: DNSIdentity): boolean {
  return identity.state === 'active' && identity.profile.active === true &&
    Array.isArray(identity.profile.globalRoles) && identity.profile.globalRoles.includes('dns-admin');
}
