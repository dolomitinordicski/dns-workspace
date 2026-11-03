import { connectFunctionsEmulator, getFunctions, httpsCallable } from 'firebase/functions';
import { identityApp } from './identityFirebase';

export type AccessRequest = { uid: string; email: string; organizationId: string;
  reportingAreaId: string; status: 'pending' | 'approved' | 'rejected' };
const functions = getFunctions(identityApp, 'europe-west8');
if (import.meta.env.MODE === 'identity-e2e') connectFunctionsEmulator(functions, '127.0.0.1', 5001);
const call = httpsCallable<Record<string, unknown>, unknown>(functions, 'dnsWorkspaceAccess');
export async function accessAction<T>(data: Record<string, unknown>): Promise<T> {
  return (await call(data)).data as T;
}
export const requestAccess = (organizationId: string, language: 'it' | 'de') =>
  accessAction<AccessRequest>({ action: 'request', organizationId, language });
export const accessStatus = () => accessAction<AccessRequest | null>({ action: 'status' });
export const saveOrganizationPolicy = (organizationId: string, tools: Record<string, 'none' | 'read' | 'write'>) =>
  accessAction({ action: 'policy', organizationId, tools });
export const accessError = (e: unknown) => e instanceof Error ? e.message : 'Operazione non completata / Vorgang fehlgeschlagen';
