import type { NextConfig } from "next";

type FirebaseWebAppConfig = Partial<{
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
  measurementId: string;
}>;

const readFirebaseWebAppConfig = (): FirebaseWebAppConfig => {
  const raw = process.env.FIREBASE_WEBAPP_CONFIG;
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw) as FirebaseWebAppConfig;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
};

const pickString = (...values: unknown[]) => {
  for (const value of values) {
    if (typeof value === "string" && value.trim().length > 0) return value;
  }
  return "";
};

const firebaseWeb = readFirebaseWebAppConfig();

const nextConfig: NextConfig = {
  env: {
    NEXT_PUBLIC_FIREBASE_API_KEY: pickString(
      process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
      firebaseWeb.apiKey
    ),
    NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: pickString(
      process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
      firebaseWeb.authDomain
    ),
    NEXT_PUBLIC_FIREBASE_PROJECT_ID: pickString(
      process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      firebaseWeb.projectId
    ),
    NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: pickString(
      process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
      firebaseWeb.storageBucket
    ),
    NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: pickString(
      process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
      firebaseWeb.messagingSenderId
    ),
    NEXT_PUBLIC_FIREBASE_APP_ID: pickString(
      process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
      firebaseWeb.appId
    ),
    NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID: pickString(
      process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
      firebaseWeb.measurementId
    ),
  },
};

export default nextConfig;
