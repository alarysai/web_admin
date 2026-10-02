import "server-only";

import { cert, getApp, getApps, initializeApp, type App } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";

import { parseAdminCredentials } from "./config";

/**
 * Server-side Firebase app with full privileges (bypasses security rules).
 * Only import from Route Handlers, Server Actions or Server Components.
 */
export function getAdminApp(): App {
  if (getApps().length > 0) return getApp();

  const credentials = parseAdminCredentials(process.env);
  return initializeApp({
    credential: cert(credentials),
    projectId: credentials.projectId,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  });
}

export const getAdminAuth = () => getAuth(getAdminApp());
export const getAdminFirestore = () => getFirestore(getAdminApp());
export const getAdminStorage = () => getStorage(getAdminApp());
