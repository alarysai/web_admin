import "server-only";

import { cert, getApp, getApps, initializeApp, type App } from "firebase-admin/app";

import { parseAdminCredentials } from "../config";

/**
 * Server-side Firebase app with full privileges (bypasses security rules).
 * Only import from Route Handlers, Server Actions or Server Components.
 *
 * Each Admin service lives in its own module (firestore.ts, auth.ts,
 * storage.ts) so a route only loads the SDK parts it uses. In particular,
 * `firebase-admin/auth` pulls in `jose` (ESM-only) and must not be loaded
 * by routes that don't need Auth.
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
