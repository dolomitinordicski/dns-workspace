import { getApps, initializeApp } from 'firebase/app';
import { getAuth, connectAuthEmulator } from 'firebase/auth';
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';

// Deliberately separate from dns-core-staff: Auth persistence depends on app name and API key.
// The public Digital Pass customer must never mutate the staff session.
const CUSTOMER_AUTH_APP_NAME = 'dns-digital-pass';
const emulatorMode = import.meta.env.MODE === 'identity-e2e';
if (emulatorMode && (!import.meta.env.DEV || !['localhost', '127.0.0.1'].includes(location.hostname))) {
  throw new Error('CUSTOMER_AUTH_EMULATORS_REQUIRE_LOCAL_DEVELOPMENT');
}
const config = emulatorMode ? {
  apiKey: 'demo-dns-identity-key', authDomain: 'localhost',
  projectId: 'demo-dns-identity', appId: 'demo-dns-identity',
} : {
  apiKey: 'AIzaSyAgxv6Z45-AfrusbFnCSyvYChRUBu6-vXc', authDomain: 'dns-core.firebaseapp.com',
  projectId: 'dns-core', appId: '1:387653285986:web:27ad6f2e9a41ea1aebb93b',
};
const existing = getApps().find(app => app.name === CUSTOMER_AUTH_APP_NAME);
if (existing && existing.options.projectId !== config.projectId) {
  throw new Error('CUSTOMER_FIREBASE_PROJECT_MISMATCH');
}
export const customerApp = existing ?? initializeApp(config, CUSTOMER_AUTH_APP_NAME);
export const customerAuth = getAuth(customerApp);
if (emulatorMode && !existing) {
  connectAuthEmulator(customerAuth, 'http://127.0.0.1:9199', { disableWarnings: true });
  connectFirestoreEmulator(getFirestore(customerApp), '127.0.0.1', 8188);
}
