import { jwtVerify, SignJWT } from "jose";

import { SESSION_DURATION_SECONDS, type AdminSession } from "../domain/admin-session";

const ALGORITHM = "HS256";
const MIN_SECRET_LENGTH = 32;

/** Reads SESSION_SECRET, the key that signs the panel's session cookie. */
export function readSessionSecret(env: Record<string, string | undefined> = process.env): Uint8Array {
  const secret = env.SESSION_SECRET?.trim();
  if (!secret || secret.length < MIN_SECRET_LENGTH) {
    throw new Error(
      `SESSION_SECRET ausente ou curta (mínimo ${MIN_SECRET_LENGTH} caracteres). ` +
        "Gere uma com: node -e \"console.log(require('crypto').randomBytes(32).toString('base64'))\"",
    );
  }
  return new TextEncoder().encode(secret);
}

export async function signSessionToken(
  session: AdminSession,
  secret: Uint8Array,
  nowSeconds = Math.floor(Date.now() / 1000),
): Promise<string> {
  return new SignJWT({ email: session.email })
    .setProtectedHeader({ alg: ALGORITHM })
    .setSubject(session.uid)
    .setIssuedAt(nowSeconds)
    .setExpirationTime(nowSeconds + SESSION_DURATION_SECONDS)
    .sign(secret);
}

/** Returns the session, or null when the token is missing, tampered with or expired. */
export async function verifySessionToken(
  token: string | undefined,
  secret: Uint8Array,
  now?: Date,
): Promise<AdminSession | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret, {
      algorithms: [ALGORITHM],
      currentDate: now,
    });
    if (!payload.sub) return null;
    const email = typeof payload.email === "string" ? payload.email : null;
    return { uid: payload.sub, email };
  } catch {
    return null;
  }
}
