import type { FirebaseOptions } from "firebase/app";

/**
 * Raw values for the browser SDK. Each `process.env.NEXT_PUBLIC_*` must be
 * referenced literally so Next.js can inline it into the client bundle at
 * build time — never read them through a dynamic key.
 */
export function readClientEnv(): Record<string, string | undefined> {
  return {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  };
}

const REQUIRED_CLIENT_KEYS = [
  "apiKey",
  "authDomain",
  "projectId",
  "storageBucket",
  "messagingSenderId",
  "appId",
] as const;

export function parseFirebaseClientConfig(
  env: Record<string, string | undefined>,
): FirebaseOptions {
  const missing = REQUIRED_CLIENT_KEYS.filter((key) => !env[key]?.trim());
  if (missing.length > 0) {
    throw new Error(
      `Firebase client config incompleta. Faltando: ${missing.join(", ")}. ` +
        "Confira as variáveis NEXT_PUBLIC_FIREBASE_* em .env.local ou na Vercel.",
    );
  }

  return Object.fromEntries(
    REQUIRED_CLIENT_KEYS.map((key) => [key, env[key]!.trim()]),
  ) as FirebaseOptions;
}

export type AdminCredentials = {
  projectId: string;
  clientEmail: string;
  privateKey: string;
};

/**
 * Service account fields for the Admin SDK (server only). Vercel stores
 * multi-line values with literal `\n`, so they are converted back to newlines.
 */
export function parseAdminCredentials(
  env: Record<string, string | undefined>,
): AdminCredentials {
  const projectId = env.FIREBASE_PROJECT_ID?.trim();
  const clientEmail = env.FIREBASE_CLIENT_EMAIL?.trim();
  const privateKey = env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n").trim();

  const missing = [
    !projectId && "FIREBASE_PROJECT_ID",
    !clientEmail && "FIREBASE_CLIENT_EMAIL",
    !privateKey && "FIREBASE_PRIVATE_KEY",
  ].filter(Boolean);

  if (missing.length > 0) {
    throw new Error(
      `Firebase Admin sem credenciais. Faltando: ${missing.join(", ")}.`,
    );
  }

  return { projectId: projectId!, clientEmail: clientEmail!, privateKey: privateKey! };
}
