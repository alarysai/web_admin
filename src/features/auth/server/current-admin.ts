import "server-only";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";

import { findAdmin } from "../data/admins-repository";
import { readSessionSecret, verifySessionToken } from "../data/session-token";
import type { AdminSession } from "../domain/admin-session";
import { SESSION_COOKIE_NAME } from "./session-cookie";

/**
 * Data Access Layer check for the panel: a valid session cookie AND an
 * admin entry that is still active. Re-reading `admins/{uid}` on each request
 * means removing or deactivating an admin cuts access on the next navigation,
 * without waiting for the cookie to expire. Cached once per request.
 */
export const getCurrentAdmin = cache(async (): Promise<AdminSession | null> => {
  const token = (await cookies()).get(SESSION_COOKIE_NAME)?.value;
  const session = await verifySessionToken(token, readSessionSecret());
  if (!session) return null;

  const admin = await findAdmin(session.uid);
  return admin?.active ? session : null;
});

export async function requireAdmin(): Promise<AdminSession> {
  const admin = await getCurrentAdmin();
  if (!admin) redirect("/login");
  return admin;
}
