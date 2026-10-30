import { onAuthStateChanged, signInWithEmailAndPassword, signOut, sendSignInLinkToEmail, isSignInWithEmailLink, signInWithEmailLink } from 'firebase/auth';
import { identityAuth } from './identityFirebase';
export const passAuth = identityAuth;
export { onAuthStateChanged, signOut };
export const passApiConfigured = Boolean(import.meta.env.VITE_DNS_DIGITAL_PASS_API_BASE);
export async function operatorSignIn(email: string, password: string) {
  return signInWithEmailAndPassword(passAuth, email.trim(), password);
}
export function digitalPassReturnUrl(currentHref: string): string {
  const current = new URL(currentHref);
  // Never redirect authentication to unapproved previews, forks or custom hosts.
  const approvedHosts = new Set([
    'dolomitinordicski.github.io',
    'dns-core.firebaseapp.com',
    'dns-core.web.app',
    'localhost',
  ]);
  if (!approvedHosts.has(current.hostname) ||
      (current.protocol !== 'https:' && current.hostname !== 'localhost')) {
    throw new Error('DIGITAL_PASS_AUTH_DOMAIN_NOT_APPROVED');
  }
  // Only use the real Workspace route on GitHub Pages, not another repo's page.
  if (current.hostname === 'dolomitinordicski.github.io' &&
      current.pathname !== '/dns-workspace/' && current.pathname !== '/dns-workspace/index.html' && current.pathname !== '/dns-workspace/pass.html') {
    throw new Error('DIGITAL_PASS_AUTH_ROUTE_NOT_APPROVED');
  }
  // Preserve GitHub Pages base path while excluding query tokens.
  return current.origin + current.pathname + '#digital-pass';
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
  if (!passApiConfigured || !passAuth.currentUser) throw new Error('SERVICE_UNAVAILABLE');
  if (!navigator.onLine) throw new Error('NEEDS_ONLINE');
  const base = new URL(import.meta.env.VITE_DNS_DIGITAL_PASS_API_BASE);
  if (base.protocol !== 'https:' && base.hostname !== 'localhost') throw new Error('INVALID_API_URL');
  const response = await fetch(base.toString().replace(/\/$/, '') + path, {
    method: 'POST', credentials: 'omit', cache: 'no-store',
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + await passAuth.currentUser.getIdToken() },
    body: JSON.stringify(body),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(typeof data.error === 'string' ? data.error : 'REQUEST_NOT_COMPLETED');
  return data as T;
}
