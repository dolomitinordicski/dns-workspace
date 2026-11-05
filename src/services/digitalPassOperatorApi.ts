import { signInWithEmailAndPassword } from 'firebase/auth';
import { identityAuth } from './identityFirebase';

// Only the staff Auth instance can operate Digital Pass staff endpoints.
export const operatorApiConfigured = Boolean(import.meta.env.VITE_DNS_DIGITAL_PASS_API_BASE);
export async function operatorSignIn(email: string, password: string) {
  return signInWithEmailAndPassword(identityAuth, email.trim(), password);
}
export async function operatorPassRequest<T>(path: string, body: unknown): Promise<T> {
  const user = identityAuth.currentUser;
  if (!operatorApiConfigured || !user) throw new Error('SERVICE_UNAVAILABLE');
  if (!navigator.onLine) throw new Error('NEEDS_ONLINE');
  const base = new URL(import.meta.env.VITE_DNS_DIGITAL_PASS_API_BASE);
  if (base.protocol !== 'https:' && base.hostname !== 'localhost') throw new Error('INVALID_API_URL');
  const response = await fetch(base.toString().replace(/\/$/, '') + path, {
    method: 'POST', credentials: 'omit', cache: 'no-store',
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + await user.getIdToken() },
    body: JSON.stringify(body),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(typeof data.error === 'string' ? data.error : 'REQUEST_NOT_COMPLETED');
  return data as T;
}
