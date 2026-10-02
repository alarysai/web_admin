import { createRemoteJWKSet, jwtVerify, type JWTVerifyGetKey } from "jose";

import type { VerifiedIdentity } from "../domain/admin-session";

/**
 * Google's public keys for Firebase ID tokens. Verifying with `jose` follows
 * Firebase's "verify ID tokens using a third-party JWT library" guide and
 * avoids `firebase-admin/auth`, which fails to load on Vercel (see README).
 */
const FIREBASE_JWKS_URL = new URL(
  "https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com",
);

let remoteKeys: JWTVerifyGetKey | undefined;

export async function verifyFirebaseIdToken(
  idToken: string,
  projectId: string,
  keys: JWTVerifyGetKey = (remoteKeys ??= createRemoteJWKSet(FIREBASE_JWKS_URL)),
): Promise<VerifiedIdentity> {
  const { payload } = await jwtVerify(idToken, keys, {
    algorithms: ["RS256"],
    issuer: `https://securetoken.google.com/${projectId}`,
    audience: projectId,
  });

  if (!payload.sub) throw new Error("ID token sem subject (uid).");
  const authTime = payload.auth_time;
  if (typeof authTime !== "number" || authTime * 1000 > Date.now()) {
    throw new Error("ID token com auth_time inválido.");
  }

  return { uid: payload.sub, email: typeof payload.email === "string" ? payload.email : null };
}
