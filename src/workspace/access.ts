import type { DNSIdentity } from '../services/dnsIdentity';
import type { DNSWorkspaceOrganization } from '../services/dnsOrganizations';
import type { WorkspaceTool } from './registry';

// Visibility hints only: each tool and API must independently enforce access.
const TOOL_PERMISSIONS: Readonly<Record<string, readonly string[]>> = {
  'data-entry': ['ticketOrders.read', 'ticketOrders.write', 'ticketSales.read', 'ticketSales.write', 'kp.read', 'kp.write'],
  'analytics': ['ticketSales.read', 'kp.read'],
  'faktura': ['ticketOrders.verify', 'ticketSales.verify'],
  'polls': ['polls.read', 'polls.manage', 'events.read', 'events.manage'],
  'flyer-studio': ['flyer.read', 'flyer.write', 'flyer.publish'],
};

export function canUseOrganization(identity: DNSIdentity, org: DNSWorkspaceOrganization): boolean {
  if (identity.state !== 'active') return false;
  if (identity.profile.globalRoles.includes('dns-admin')) return true;
  if (identity.memberships.some(m => m.organizationId === org.id)) return true;
  return org.id === 'dolomiti-nordicski' && identity.grants.some(
    g => g.scopeType === 'network' && g.scopeId === 'dolomiti-nordicski');
}

export function toolsForOrganization(
  identity: DNSIdentity, org: DNSWorkspaceOrganization, tools: readonly WorkspaceTool[],
): WorkspaceTool[] {
  if (!canUseOrganization(identity, org) || identity.state !== 'active') return [];
  if (identity.profile.globalRoles.includes('dns-admin')) {
    return tools.filter(t => t.lifecycle !== 'legacy');
  }
  const granted = new Set(identity.grants.filter(g =>
    g.scopeType === 'network' && g.scopeId === 'dolomiti-nordicski' ||
    g.scopeType === 'organization' && g.scopeId === org.id ||
    g.scopeType === 'reportingArea' && org.reportingAreaIds.includes(g.scopeId))
    .flatMap(g => g.permissions));
  return tools.filter(tool => {
    // Organization policy is a cap, never an entitlement: grants remain required.
    // Absence of a policy retains the legacy behavior during phased rollout.
    const policy = identity.toolPolicies[org.id];
    if (policy?.[tool.id] === 'none') return false;
    // Firestore treats an omitted Data Entry level in an existing policy as none.
    if (tool.id === 'data-entry' && policy && !['read', 'write'].includes(policy[tool.id] ?? 'none')) return false;
    if (tool.id === 'partner-hub') return identity.memberships.some(m => m.organizationId === org.id);
    const needed = TOOL_PERMISSIONS[tool.id];
    return Boolean(needed?.some(permission => granted.has(permission as never)));
  });
}
