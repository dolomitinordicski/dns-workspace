import { serverTimestamp } from 'firebase/firestore';

/**
 * Virtual DNS test area, for emulators and isolated staging environments only.
 * Never merge these entities into canonical REPORTING_AREAS or production aggregates.
 * These identifiers are deliberately distinct from all real area / organization IDs.
 */
export const VIRTUAL_AREA = Object.freeze({
  reportingAreaId: 'dns-test-area',
  organizationId: 'dns-test-organisation',
  secondaryOrganizationId: 'dns-test-organisation-2',
  foreignOrganizationId: 'dns-test-foreign-organisation',
  name: 'DNS Test Area',
  environment: 'test',
  synthetic: true,
  reportingEnabled: false,
  billingEnabled: false,
  publicVisible: false,
});

export const VIRTUAL_IDENTITIES = Object.freeze({
  writer: 'dns-test-writer',
  reader: 'dns-test-reader',
  outsider: 'dns-test-outsider',
  admin: 'dns-test-admin',
});

export function virtualPolicy(level) {
  if (!['none', 'read', 'write'].includes(level)) throw new Error('Invalid matrix level');
  return {
    organizationId: VIRTUAL_AREA.organizationId,
    tools: { 'data-entry': level },
    updatedBy: VIRTUAL_IDENTITIES.admin,
    updatedAt: serverTimestamp(),
  };
}

export function syntheticOrder(id, organizationId = VIRTUAL_AREA.organizationId) {
  return {
    id, seasonId: '2026-27',
    organizationId,
    reportingAreaId: VIRTUAL_AREA.reportingAreaId,
    category: 'pocketfolder', status: 'draft',
  };
}
