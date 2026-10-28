import { GoogleAuthProvider, onAuthStateChanged, signInWithEmailAndPassword, signInWithPopup, signOut } from 'firebase/auth';
import { collection, doc, getDoc, getDocs, getFirestore, query, where } from 'firebase/firestore';
import type { DNSAccessGrant, DNSMembership, DNSUserProfile } from '@dolomitinordicski/dns-shared-data';
import { passAuth } from './digitalPassApi';

export type DNSIdentity =
  | { state: 'loading' | 'signed-out' }
  | { state: 'error'; email: string; message: string }
  | { state: 'inactive'; email: string; reason: 'missing-profile' | 'inactive' }
  | { state: 'active'; email: string; uid: string; profile: DNSUserProfile;
      memberships: DNSMembership[]; grants: DNSAccessGrant[] };

const coreDb = getFirestore(passAuth.app);

function withinDates(item: { active: boolean; validFrom?: string; validTo?: string }) {
  const now = Date.now();
  const from = item.validFrom ? Date.parse(item.validFrom) : NaN;
  const to = item.validTo ? Date.parse(item.validTo) : NaN;
  return item.active &&
    (!item.validFrom || (Number.isFinite(from) && from <= now)) &&
    (!item.validTo || (Number.isFinite(to) && to >= now));
}

export function watchDNSIdentity(notify: (value: DNSIdentity) => void): () => void {
  let generation = 0;
  const unsubscribe = onAuthStateChanged(passAuth, async user => {
    const revision = ++generation;
    if (!user) { notify({ state: 'signed-out' }); return; }
    notify({ state: 'loading' });
    try {
      const [profileDoc, memberships, grants] = await Promise.all([
        getDoc(doc(coreDb, 'users', user.uid)),
        getDocs(query(collection(coreDb, 'memberships'), where('userId', '==', user.uid))),
        getDocs(query(collection(coreDb, 'accessGrants'), where('userId', '==', user.uid))),
      ]);
      if (revision !== generation) return;
      const email = user.email || '';
      if (!profileDoc.exists()) {
        notify({ state: 'inactive', email, reason: 'missing-profile' });
        return;
      }
      const profile = profileDoc.data() as DNSUserProfile;
      if (!profile.active) {
        notify({ state: 'inactive', email, reason: 'inactive' });
        return;
      }
      notify({
        state: 'active', email, uid: user.uid, profile,
        memberships: memberships.docs.map(d => d.data() as DNSMembership).filter(withinDates),
        grants: grants.docs.map(d => d.data() as DNSAccessGrant).filter(withinDates),
      });
    } catch {
      if (revision === generation) notify({
        state: 'error', email: user.email || '',
        message: 'DNS Core: accesso al profilo o ai permessi non disponibile.',
      });
    }
  }, () => notify({ state: 'error', email: '', message: 'DNS Core Authentication non disponibile.' }));
  return () => { generation += 1; unsubscribe(); };
}

export async function signInDNSGoogle() {
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });
  await signInWithPopup(passAuth, provider);
}
export async function signInDNSEmail(email: string, password: string) {
  await signInWithEmailAndPassword(passAuth, email.trim(), password);
}
export async function signOutDNS() { await signOut(passAuth); }
