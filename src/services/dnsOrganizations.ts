import { collection, getDocs, getFirestore } from 'firebase/firestore';
import type { Organization } from '@dolomitinordicski/dns-shared-data';
import { passAuth } from './digitalPassApi';

export type DNSWorkspaceOrganization = Pick<Organization,
  'id' | 'canonicalName' | 'localizedName' | 'organizationType' | 'reportingAreaIds'> & {
  address?: { street?: string; postalCode?: string; city?: string; country?: string };
  phone?: string;
  email?: string;
  website?: string;
  brandLogoUrl?: string;
};

type RegionLogoManifest = {
  basePath?: string;
  assets?: Array<{
    filename: string;
    priority?: 'primary' | 'secondary';
    entityBindings?: Array<{ entityType: 'reportingArea' | 'destination' | 'organization'; entityId: string }>;
  }>;
};

const SHARED_DATA_RAW_BASE = 'https://raw.githubusercontent.com/dolomitinordicski/dns-shared-data/main';
const REGION_LOGO_MANIFEST_URL = `${SHARED_DATA_RAW_BASE}/brand/regions/manifest.json`;

async function loadRegionLogoManifest(): Promise<RegionLogoManifest | null> {
  try {
    const response = await fetch(REGION_LOGO_MANIFEST_URL, { cache: 'force-cache' });
    if (!response.ok) return null;
    return await response.json() as RegionLogoManifest;
  } catch {
    return null;
  }
}

function resolveManifestLogo(
  org: DNSWorkspaceOrganization,
  manifest: RegionLogoManifest | null,
): string | undefined {
  if (!manifest?.assets?.length) return undefined;
  const rank = (priority?: 'primary' | 'secondary') => priority === 'primary' ? 0 : priority === 'secondary' ? 2 : 1;
  const candidates = manifest.assets
    .filter(asset => asset.entityBindings?.some(binding =>
      binding.entityType === 'organization' && binding.entityId === org.id))
    .sort((a, b) => rank(a.priority) - rank(b.priority));
  const fallback = manifest.assets
    .filter(asset => asset.entityBindings?.some(binding =>
      binding.entityType === 'reportingArea' && org.reportingAreaIds.includes(binding.entityId)))
    .sort((a, b) => rank(a.priority) - rank(b.priority));
  const asset = candidates[0] ?? fallback[0];
  if (!asset) return undefined;
  const basePath = manifest.basePath || 'brand/regions';
  return `${SHARED_DATA_RAW_BASE}/${basePath}/${encodeURIComponent(asset.filename)}`;
}

export async function getDNSWorkspaceOrganizations(): Promise<DNSWorkspaceOrganization[]> {
  const [result, logoManifest] = await Promise.all([
    getDocs(collection(getFirestore(passAuth.app), 'organizations')),
    loadRegionLogoManifest(),
  ]);
  return result.docs.map(record => ({ ...record.data(), id: record.id }) as DNSWorkspaceOrganization & { active?: boolean })
    .filter(org => org.active !== false &&
      (org.organizationType === 'tourism-organisation' ||
       (org.organizationType === 'network-operator' && org.id === 'dolomiti-nordicski')))
    .map(org => ({ ...org, brandLogoUrl: resolveManifestLogo(org, logoManifest) }))
    .sort((a, b) => a.id === 'dolomiti-nordicski' ? -1 :
      b.id === 'dolomiti-nordicski' ? 1 :
      a.canonicalName.localeCompare(b.canonicalName, 'de'));
}

export function organizationName(org: DNSWorkspaceOrganization, language: 'de' | 'it') {
  return org.localizedName?.[language] || org.canonicalName;
}


export function organizationLogoUrl(org: DNSWorkspaceOrganization): string | null {
  return org.brandLogoUrl || null;
}
