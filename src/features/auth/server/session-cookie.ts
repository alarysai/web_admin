import { SESSION_DURATION_SECONDS } from "../domain/admin-session";

export const SESSION_COOKIE_NAME = "admin_session";

/** httpOnly: unreachable from page JavaScript. secure: HTTPS only outside local dev. */
export function sessionCookieOptions(production = process.env.NODE_ENV === "production") {
  return {
    httpOnly: true,
    secure: production,
    sameSite: "lax" as const,
    path: "/",
    maxAge: SESSION_DURATION_SECONDS,
  };
}
