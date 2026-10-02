import { NextResponse, type NextRequest } from "next/server";

import { readSessionSecret, verifySessionToken } from "@/features/auth/data/session-token";
import { SESSION_COOKIE_NAME } from "@/features/auth/server/session-cookie";

/**
 * Optimistic check: only the signature/expiry of the session cookie, no
 * database access. The authoritative check (admin still active) runs in the
 * panel layout through requireAdmin().
 */
export async function proxy(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const session = await verifySessionToken(token, readSessionSecret());
  if (session) return NextResponse.next();

  const loginUrl = new URL("/login", request.url);
  const { pathname, search } = request.nextUrl;
  if (pathname !== "/") loginUrl.searchParams.set("next", pathname + search);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  // Everything except the login page, API routes (they guard themselves),
  // Next.js internals and files with an extension (favicon, images…).
  matcher: ["/((?!(?:login|api)(?:/|$)|_next/static|_next/image|.*\\.[^/]+$).*)"],
};
