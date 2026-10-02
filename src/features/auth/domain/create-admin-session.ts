import type { AdminRecord, AdminSession, VerifiedIdentity } from "./admin-session";

export type CreateAdminSessionDeps = {
  verifyIdToken: (idToken: string) => Promise<VerifiedIdentity>;
  findAdmin: (uid: string) => Promise<AdminRecord | null>;
};

export type CreateAdminSessionResult =
  | { status: "ok"; session: AdminSession }
  | { status: "invalid-token" }
  | { status: "not-admin" };

/**
 * Business rule for signing in to the panel: the Firebase ID token must be
 * valid AND the user must have an active entry in `admins/{uid}`.
 */
export async function createAdminSession(
  idToken: string,
  deps: CreateAdminSessionDeps,
): Promise<CreateAdminSessionResult> {
  if (!idToken.trim()) return { status: "invalid-token" };

  let identity: VerifiedIdentity;
  try {
    identity = await deps.verifyIdToken(idToken);
  } catch {
    return { status: "invalid-token" };
  }

  const admin = await deps.findAdmin(identity.uid);
  if (!admin?.active) return { status: "not-admin" };

  return { status: "ok", session: { uid: identity.uid, email: identity.email } };
}
