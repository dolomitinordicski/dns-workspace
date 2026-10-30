import { initializeApp, getApps } from 'firebase/app';
import { getAuth, connectAuthEmulator } from 'firebase/auth';
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';

// The dedicated development mode can only address a demo project on loopback.
// No environment-provided Firebase project, credentials or remote host are accepted.
const emulatorMode = import.meta.env.MODE === 'identity-e2e';
if (emulatorMode && (!import.meta.env.DEV || !['localhost', '127.0.0.1'].includes(location.hostname))) {
  throw new Error('IDENTITY_EMULATORS_REQUIRE_LOCAL_DEVELOPMENT');
}
const config = emulatorMode ? {
  apiKey: 'demo-dns-identity-key', authDomain: 'localhost',
  projectId: 'demo-dns-identity', appId: 'demo-dns-identity',
} : {
  apiKey: 'AIzaSyAgxv6Z45-AfrusbFnCSyvYChRUBu6-vXc', authDomain: 'dns-core.firebaseapp.com',
  projectId: 'dns-core', appId: '1:387653285986:web:27ad6f2e9a41ea1aebb93b',
};
const existing = getApps().find(a => a.name === 'dns-digital-pass');
export const identityApp = existing ?? initializeApp(config, 'dns-digital-pass');
export const identityAuth = getAuth(identityApp);
if (emulatorMode && !existing) {
  connectAuthEmulator(identityAuth, 'http://127.0.0.1:9199', { disableWarnings: true });
  connectFirestoreEmulator(getFirestore(identityApp), '127.0.0.1', 8188);
}
