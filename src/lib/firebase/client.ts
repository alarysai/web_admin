import { getApp, getApps, initializeApp, type FirebaseApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

import { parseFirebaseClientConfig, readClientEnv } from "./config";

/** Browser-side Firebase app, created once and reused across hot reloads. */
export function getFirebaseApp(): FirebaseApp {
  if (getApps().length > 0) return getApp();
  return initializeApp(parseFirebaseClientConfig(readClientEnv()));
}

export const getClientAuth = () => getAuth(getFirebaseApp());
export const getClientFirestore = () => getFirestore(getFirebaseApp());
export const getClientStorage = () => getStorage(getFirebaseApp());
