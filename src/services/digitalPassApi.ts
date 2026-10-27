import { getApps, initializeApp } from 'firebase/app';
import { getAuth, onAuthStateChanged, signInWithEmailAndPassword, signOut, sendSignInLinkToEmail, isSignInWithEmailLink, signInWithEmailLink } from 'firebase/auth';
// Same public Firebase application configuration already used by DNS Data Entry.
const app = getApps().find(a => a.options.projectId === 'dns-core') ?? initializeApp({
  apiKey: 'AIzaSyAgxv6Z45-AfrusbFnCSyvYChRUBu6-vXc', authDomain: 'dns-core.firebaseapp.com',
  projectId: 'dns-core', appId: '1:387653285986:web:27ad6f2e9a41ea1aebb93b',
}, 'dns-digital-pass');
export const passAuth = getAuth(app);
export { onAuthStateChanged, signOut };
export const passApiConfigured = Boolean(import.meta.env.VITE_DNS_DIGITAL_PASS_API_BASE);
export async function operatorSignIn(email: string, password: string) {
  return signInWithEmailAndPassword(passAuth, email.trim(), password);
}
export async function requestEmailLink(email: string) {
  const url = new URL(location.href); url.search = ''; url.hash = 'digital-pass';
  await sendSignInLinkToEmail(passAuth, email.trim(), { url: url.toString(), handleCodeInApp: true });
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
