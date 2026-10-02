import { FirebaseError } from "firebase/app";
import { signInWithEmailAndPassword, signOut } from "firebase/auth";

import { getClientAuth } from "@/lib/firebase/client";

export type SignInErrorCode =
  | "invalid-credentials"
  | "not-admin"
  | "too-many-requests"
  | "network"
  | "unknown";

export type SignInResult = { ok: true } | { ok: false; error: SignInErrorCode };

export type AdminSignIn = (email: string, password: string) => Promise<SignInResult>;

/**
 * Browser side of the login: Firebase Auth (email/password), then exchange
 * the ID token for the panel's session cookie at POST /api/session.
 */
export const signInAdmin: AdminSignIn = async (email, password) => {
  const auth = getClientAuth();
  try {
    const credential = await signInWithEmailAndPassword(auth, email, password);
    const idToken = await credential.user.getIdToken();
    const response = await fetch("/api/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ idToken }),
    });
    if (response.ok) return { ok: true };

    await signOut(auth);
    return { ok: false, error: response.status === 403 ? "not-admin" : "unknown" };
  } catch (error) {
    return { ok: false, error: toSignInErrorCode(error) };
  }
};

export function toSignInErrorCode(error: unknown): SignInErrorCode {
  if (!(error instanceof FirebaseError)) {
    return error instanceof TypeError ? "network" : "unknown";
  }
  switch (error.code) {
    case "auth/invalid-credential":
    case "auth/invalid-email":
    case "auth/user-not-found":
    case "auth/wrong-password":
    case "auth/user-disabled":
      return "invalid-credentials";
    case "auth/too-many-requests":
      return "too-many-requests";
    case "auth/network-request-failed":
      return "network";
    default:
      return "unknown";
  }
}

/** Logout: clears the session cookie and the Firebase Auth browser session. */
export async function signOutAdmin(): Promise<void> {
  await fetch("/api/session", { method: "DELETE" });
  await signOut(getClientAuth());
}
