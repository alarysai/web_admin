import { cookies } from "next/headers";

import { findAdmin } from "@/features/auth/data/admins-repository";
import { verifyFirebaseIdToken } from "@/features/auth/data/firebase-id-token";
import { readSessionSecret, signSessionToken } from "@/features/auth/data/session-token";
import { createAdminSession } from "@/features/auth/domain/create-admin-session";
import { SESSION_COOKIE_NAME, sessionCookieOptions } from "@/features/auth/server/session-cookie";

/**
 * POST /api/session  { idToken }  → creates the admin session cookie.
 *   200 ok · 400 bad body · 401 invalid token · 403 not an active admin
 * DELETE /api/session            → logout (clears the cookie).
 */
export async function POST(request: Request) {
  const idToken = await readIdToken(request);
  if (idToken === null) return Response.json({ error: "bad-request" }, { status: 400 });

  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? "";
  const result = await createAdminSession(idToken, {
    verifyIdToken: (token) => verifyFirebaseIdToken(token, projectId),
    findAdmin,
  });

  if (result.status === "invalid-token") {
    return Response.json({ error: "invalid-token" }, { status: 401 });
  }
  if (result.status === "not-admin") {
    return Response.json({ error: "not-admin" }, { status: 403 });
  }

  const token = await signSessionToken(result.session, readSessionSecret());
  (await cookies()).set(SESSION_COOKIE_NAME, token, sessionCookieOptions());
  return Response.json({ ok: true });
}

export async function DELETE() {
  (await cookies()).delete(SESSION_COOKIE_NAME);
  return Response.json({ ok: true });
}

async function readIdToken(request: Request): Promise<string | null> {
  try {
    const body = await request.json();
    return typeof body?.idToken === "string" ? body.idToken : null;
  } catch {
    return null;
  }
}
