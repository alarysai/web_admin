/** An authenticated administrator, as carried by the session cookie. */
export type AdminSession = {
  uid: string;
  email: string | null;
};

/** Identity extracted from a verified Firebase ID token. */
export type VerifiedIdentity = {
  uid: string;
  email: string | null;
};

/** Entry of the `admins/{uid}` collection. Only `active === true` grants access. */
export type AdminRecord = {
  uid: string;
  email: string | null;
  active: boolean;
};

/** Session lifetime. After it expires the admin must sign in again. */
export const SESSION_DURATION_SECONDS = 8 * 60 * 60;
