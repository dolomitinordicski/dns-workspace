import { collection, getDocs, getFirestore } from 'firebase/firestore';
import type { Organization } from '@dolomitinordicski/dns-shared-data';
import { passAuth } from './digitalPassApi';

export type DNSWorkspaceOrganization = Pick<Organization,
  'id' | 'canonicalName' | 'localizedName' | 'organizationType' | 'reportingAreaIds'>;

export async function getDNSWorkspaceOrganizations(): Promise<DNSWorkspaceOrganization[]> {
  const result = await getDocs(collection(getFirestore(passAuth.app), 'organizations'));
  return result.docs.map(record => ({ ...record.data(), id: record.id }) as DNSWorkspaceOrganization & { active?: boolean })
    .filter(org => org.active !== false &&
      (org.organizationType === 'tourism-organisation' ||
       (org.organizationType === 'network-operator' && org.id === 'dolomiti-nordicski')))
    .sort((a, b) => a.id === 'dolomiti-nordicski' ? -1 :
      b.id === 'dolomiti-nordicski' ? 1 :
      a.canonicalName.localeCompare(b.canonicalName, 'de'));
}

export function organizationName(org: DNSWorkspaceOrganization, language: 'de' | 'it') {
  return org.localizedName?.[language] || org.canonicalName;
}
