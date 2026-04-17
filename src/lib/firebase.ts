import { initializeApp, getApps, getApp, FirebaseApp } from "firebase/app";
import { getAuth, Auth } from "firebase/auth";
import { getFirestore, Firestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// When env vars are missing (e.g. at build time before .env.local is set up)
// we use a harmless placeholder so imports don't throw. At runtime, the real
// config must be present for auth/firestore to actually work.
const hasConfig = !!firebaseConfig.apiKey && !!firebaseConfig.projectId;
const safeConfig = hasConfig
  ? firebaseConfig
  : {
      apiKey: "build-placeholder",
      authDomain: "build.firebaseapp.com",
      projectId: "build-placeholder",
      storageBucket: "build.appspot.com",
      messagingSenderId: "0",
      appId: "1:0:web:0",
    };

const app: FirebaseApp = getApps().length ? getApp() : initializeApp(safeConfig);
export const auth: Auth = getAuth(app);
export const db: Firestore = getFirestore(app);
export const isFirebaseConfigured = hasConfig;
export default app;
