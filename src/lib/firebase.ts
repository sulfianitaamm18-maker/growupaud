import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth, Auth, updatePassword } from 'firebase/auth';
import { getFirestore, initializeFirestore, Firestore } from 'firebase/firestore';

const env =
  (typeof import.meta !== 'undefined' && (import.meta as any).env) ||
  (typeof process !== 'undefined' && process.env) ||
  {};

const firebaseConfig = {
  apiKey: env.VITE_FIREBASE_API_KEY || '',
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN || '',
  projectId: env.VITE_FIREBASE_PROJECT_ID || '',
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET || '',
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
  appId: env.VITE_FIREBASE_APP_ID || ''
};

if (!firebaseConfig.apiKey || !firebaseConfig.projectId) {
  console.error('Firebase belum dikonfigurasi. Periksa environment variables VITE_FIREBASE_* di file .env');
}

export const app: FirebaseApp = !getApps().length ? initializeApp(firebaseConfig) : getApp();
export const auth: Auth = getAuth(app);

// Initialize Firestore with auto-detect long polling to prevent WebChannelConnection and RPC Listen dropouts
let firestoreDb: Firestore;
try {
  firestoreDb = initializeFirestore(app, {
    experimentalAutoDetectLongPolling: true,
  });
} catch (e) {
  firestoreDb = getFirestore(app);
}
export const db: Firestore = firestoreDb;
export { updatePassword };

/**
 * Formats a school username or full email into the internal email format required by Firebase Auth.
 * Example: 'ulfi' or 'ulfi@school.growupaud.local' -> 'ulfi@school.growupaud.local'
 */
export function formatAuthEmail(input: string): string {
  const trimmed = input.toLowerCase().trim();
  if (trimmed.includes('@')) {
    const userPart = trimmed.split('@')[0].replace(/[^a-z0-9._-]/g, '');
    return `${userPart || 'user'}@school.growupaud.local`;
  }
  const cleanUsername = trimmed.replace(/[^a-z0-9._-]/g, '');
  return `${cleanUsername || 'user'}@school.growupaud.local`;
}
