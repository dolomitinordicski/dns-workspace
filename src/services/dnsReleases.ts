import { collection, getDocs, getFirestore, query, where } from 'firebase/firestore';
import { passAuth } from './digitalPassApi';

export type DNSRelease = {
  id: string;
  toolId: string;
  version: string;
  type: 'technical' | 'feature' | 'urgent';
  audience: 'dns' | 'area';
  published: boolean;
  publishedAt: string;
  title: { it: string; de: string };
  description: { it: string; de: string };
};

// Server-side Firestore rules must enforce audience separation as well.
export async function loadDNSReleases(isAdmin: boolean, allowedToolIds: string[]): Promise<DNSRelease[]> {
  const db = getFirestore(passAuth.app);
  const base = collection(db, 'systemReleases');
  const snapshots = await Promise.all(
    (isAdmin ? ['dns', 'area'] : ['area']).map(audience =>
      getDocs(query(base, where('published', '==', true), where('audience', '==', audience), where('type', 'in', isAdmin ? ['technical', 'feature', 'urgent'] : ['feature', 'urgent'])))
    )
  );
  return snapshots.flatMap(snapshot => snapshot.docs.map(item => ({ ...item.data(), id: item.id } as DNSRelease)))
    .filter(item => isAdmin || (item.type !== 'technical' && allowedToolIds.includes(item.toolId)))
    .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
}
