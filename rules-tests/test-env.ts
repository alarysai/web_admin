import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { initializeTestEnvironment, type RulesTestEnvironment } from "@firebase/rules-unit-testing";

export const PROJECT_ID = "demo-alarysai-rules";

export const ADMIN_UID = "admin-1";
export const INACTIVE_ADMIN_UID = "admin-off";
export const USER_UID = "user-1";
export const OTHER_UID = "user-2";

/** Starts a rules test environment against the local emulators (see firebase.json). */
export function createTestEnv(): Promise<RulesTestEnvironment> {
  const root = resolve(__dirname, "..");
  return initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: { rules: readFileSync(resolve(root, "firestore.rules"), "utf8"), host: "127.0.0.1", port: 8080 },
    storage: { rules: readFileSync(resolve(root, "storage.rules"), "utf8"), host: "127.0.0.1", port: 9199 },
  });
}

/** Seeds the admins collection, bypassing the rules (as the server would). */
export async function seedAdmins(env: RulesTestEnvironment) {
  await env.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore();
    await db.doc(`admins/${ADMIN_UID}`).set({ email: "admin@alarys.com", active: true });
    await db.doc(`admins/${INACTIVE_ADMIN_UID}`).set({ email: "off@alarys.com", active: false });
  });
}
