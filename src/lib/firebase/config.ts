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

const PEM_HEADER = "-----BEGIN PRIVATE KEY-----";

/**
 * Accepts the `private_key` value however it was pasted into an env var:
 * with literal `\n`, wrapped in the quotes/trailing comma copied from the
 * service account JSON, with Windows line endings, or as the whole JSON file.
 */
export function normalizePrivateKey(raw: string | undefined): string | undefined {
  let key = raw?.trim();
  if (!key) return undefined;

  if (key.startsWith("{")) {
    try {
      key = String(JSON.parse(key).private_key ?? "");
    } catch {
      // Not valid JSON: fall through and let the PEM check below report it.
    }
  }

  key = key
    .replace(/,$/, "")
    .replace(/^(["'])([\s\S]*)\1$/, "$2")
    .replace(/\\n/g, "\n")
    .replace(/\r\n/g, "\n")
    .trim();

  return key || undefined;
}

/**
 * Service account fields for the Admin SDK (server only). Vercel stores
 * multi-line values with literal `\n`, so they are converted back to newlines.
 */
export function parseAdminCredentials(
  env: Record<string, string | undefined>,
): AdminCredentials {
  const projectId = env.FIREBASE_PROJECT_ID?.trim();
  const clientEmail = env.FIREBASE_CLIENT_EMAIL?.trim();
  const privateKey = normalizePrivateKey(env.FIREBASE_PRIVATE_KEY);

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

  if (!privateKey!.startsWith(PEM_HEADER)) {
    throw new Error(
      `FIREBASE_PRIVATE_KEY inválida: deve começar com "${PEM_HEADER}". ` +
        'Cole só o valor do campo "private_key" do JSON da service account.',
    );
  }

  return { projectId: projectId!, clientEmail: clientEmail!, privateKey: privateKey! };
}
