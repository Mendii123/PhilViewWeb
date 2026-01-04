import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getAnalytics, isSupported as analyticsSupported } from "firebase/analytics";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

// Avoid reinitializing in hot-reload.
const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
const getSecondaryApp = () => {
  const existing = getApps().find((candidate) => candidate.name === "secondary");
  return existing ?? initializeApp(firebaseConfig, "secondary");
};

export const auth = getAuth(app);
export const secondaryAuth = getAuth(getSecondaryApp());
export const googleProvider = new GoogleAuthProvider();
export const db = getFirestore(app);

// Analytics is optional; only enable in browser and when supported.
export const analyticsPromise = (async () => {
  if (typeof window === "undefined") return null;
  try {
    return (await analyticsSupported()) ? getAnalytics(app) : null;
  } catch {
    return null;
  }
})();

export { app };
