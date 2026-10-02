import { NextRequest } from "next/server";
import { beforeAll, describe, expect, it } from "vitest";

import { readSessionSecret, signSessionToken } from "@/features/auth/data/session-token";
import { SESSION_COOKIE_NAME } from "@/features/auth/server/session-cookie";

import { config, proxy } from "./proxy";

beforeAll(() => {
  process.env.SESSION_SECRET = "s".repeat(32);
});

function request(path: string, cookie?: string) {
  const headers = cookie ? { cookie: `${SESSION_COOKIE_NAME}=${cookie}` } : undefined;
  return new NextRequest(new URL(path, "https://painel.test"), { headers });
}

describe("proxy", () => {
  it("lets a request with a valid session through", async () => {
    const token = await signSessionToken({ uid: "uid-1", email: null }, readSessionSecret());
    const response = await proxy(request("/questionarios", token));
    expect(response.headers.get("location")).toBeNull();
    expect(response.headers.get("x-middleware-next")).toBe("1");
  });

  it("redirects to /login keeping the requested page in ?next=", async () => {
    const response = await proxy(request("/questionarios?categoria=etica"));
    const location = new URL(response.headers.get("location")!);
    expect(location.pathname).toBe("/login");
    expect(location.searchParams.get("next")).toBe("/questionarios?categoria=etica");
  });

  it("redirects the home page to /login without ?next=", async () => {
    const response = await proxy(request("/"));
    expect(response.headers.get("location")).toBe("https://painel.test/login");
  });

  describe("matcher", () => {
    // The pattern is a single custom regex group, which Next.js compiles as-is
    // and anchors to the whole path.
    const matches = (path: string) => new RegExp(`^${config.matcher[0]}$`).test(path);

    it.each(["/", "/questionarios", "/questionarios/abc/passos", "/anunciantes", "/logins", "/apis"])(
      "protects %s",
      (path) => expect(matches(path)).toBe(true),
    );

    it.each([
      "/login",
      "/login/",
      "/api/health",
      "/api/session",
      "/_next/static/chunk.js",
      "/_next/image",
      "/favicon.ico",
      "/images/logo.png",
    ])("skips %s", (path) => expect(matches(path)).toBe(false));
  });

  it("redirects when the cookie is invalid", async () => {
    const response = await proxy(request("/", "forged"));
    expect(new URL(response.headers.get("location")!).pathname).toBe("/login");
  });
});
