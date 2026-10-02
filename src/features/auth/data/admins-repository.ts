import "server-only";

import { getAdminFirestore } from "@/lib/firebase/admin/firestore";

import type { AdminRecord } from "../domain/admin-session";

export const ADMINS_COLLECTION = "admins";

/** Maps an `admins/{uid}` document defensively: anything but `active: true` denies access. */
export function toAdminRecord(uid: string, data: Record<string, unknown> | undefined): AdminRecord | null {
  if (!data) return null;
  return {
    uid,
    email: typeof data.email === "string" ? data.email : null,
    active: data.active === true,
  };
}

export async function findAdmin(uid: string): Promise<AdminRecord | null> {
  const snapshot = await getAdminFirestore().collection(ADMINS_COLLECTION).doc(uid).get();
  return toAdminRecord(uid, snapshot.data());
}
