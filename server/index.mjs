import { initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { accessService } from './service.mjs';

initializeApp();
// No deployment workflow: deployment is a separate, explicit release decision.
export const dnsWorkspaceAccess = onCall({ region: 'europe-west8', maxInstances: 3 }, async request => {
  try { return await accessService(getFirestore(), getAuth(), request.auth, request.data); }
  catch (error) {
    if (error?.accessCode) throw new HttpsError(error.accessCode, error.message);
    // Never expose provider responses, tokens or internal database errors.
    throw new HttpsError('internal', 'Operazione non completata. Riprova.');
  }
});
