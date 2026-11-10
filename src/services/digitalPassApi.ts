import { onAuthStateChanged, signOut, sendSignInLinkToEmail, isSignInWithEmailLink, signInWithEmailLink } from 'firebase/auth';
import { customerAuth } from './customerFirebase';
export const passAuth = customerAuth;
export { onAuthStateChanged, signOut };
export const passApiConfigured = Boolean(import.meta.env.VITE_DNS_DIGITAL_PASS_API_BASE);
export function digitalPassReturnUrl(currentHref: string): string {
  const current = new URL(currentHref);
  const approvedHosts = new Set([
    'dolomitinordicski.github.io', 'dns-core.firebaseapp.com',
    'dns-core.web.app', 'localhost', '127.0.0.1',
  ]);
  if (!approvedHosts.has(current.hostname) ||
      (current.protocol !== 'https:' && !['localhost','127.0.0.1'].includes(current.hostname))) {
    throw new Error('DIGITAL_PASS_AUTH_DOMAIN_NOT_APPROVED');
  }
  // Customer email links always return to the isolated customer page, never Workspace index.
  if (current.hostname === 'dolomitinordicski.github.io') {
    if (!['/dns-workspace/pass.html', '/dns-workspace/', '/dns-workspace/index.html'].includes(current.pathname)) {
      throw new Error('DIGITAL_PASS_AUTH_ROUTE_NOT_APPROVED');
    }
    return current.origin + '/dns-workspace/pass.html#digital-pass';
  }
  return current.origin + (current.pathname.startsWith('/dns-workspace/') ? '/dns-workspace/pass.html' : '/pass.html') + '#digital-pass';
}
export async function requestEmailLink(email: string) {
  await sendSignInLinkToEmail(passAuth, email.trim(), {
    url: digitalPassReturnUrl(location.href),
    handleCodeInApp: true,
  });
}
export async function finishEmailLink(email: string) {
  if (!isSignInWithEmailLink(passAuth, location.href)) throw new Error('INVALID_EMAIL_LINK');
  await signInWithEmailLink(passAuth, email.trim(), location.href);
  history.replaceState(null, '', location.pathname + '#digital-pass');
}
export const hasEmailLink = () => isSignInWithEmailLink(passAuth, location.href);
export async function passRequest<T>(path: string, body: unknown): Promise<T> {
  const user=passAuth.currentUser;
  if (!passApiConfigured || !user) throw new Error('SERVICE_UNAVAILABLE');
  if (!navigator.onLine) throw new Error('NEEDS_ONLINE');
  const base = new URL(import.meta.env.VITE_DNS_DIGITAL_PASS_API_BASE);
  if (base.protocol !== 'https:' && base.hostname !== 'localhost') throw new Error('INVALID_API_URL');
  const response = await fetch(base.toString().replace(/\/$/, '') + path, {
    method: 'POST', credentials: 'omit', cache: 'no-store',
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + await user.getIdToken() },
    body: JSON.stringify(body),
  });
  const data = await response.json();
  if(passAuth.currentUser?.uid!==user.uid)throw new Error('UNAUTHORIZED');
  if (!response.ok) throw new Error(typeof data.error === 'string' ? data.error : 'REQUEST_NOT_COMPLETED');
  return data as T;
}

