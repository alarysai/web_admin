import { describe, expect, it } from "vitest";

import { SESSION_DURATION_SECONDS } from "../domain/admin-session";
import { readSessionSecret, signSessionToken, verifySessionToken } from "./session-token";

const secret = readSessionSecret({ SESSION_SECRET: "a".repeat(32) });
const otherSecret = readSessionSecret({ SESSION_SECRET: "b".repeat(32) });
const session = { uid: "uid-1", email: "admin@alarys.com" };

describe("session token", () => {
  it("round-trips the admin session", async () => {
    const token = await signSessionToken(session, secret);
    await expect(verifySessionToken(token, secret)).resolves.toEqual(session);
  });

  it("keeps a null email", async () => {
    const token = await signSessionToken({ uid: "uid-2", email: null }, secret);
    await expect(verifySessionToken(token, secret)).resolves.toEqual({ uid: "uid-2", email: null });
  });

  it("rejects a token signed with another secret", async () => {
    const token = await signSessionToken(session, otherSecret);
    await expect(verifySessionToken(token, secret)).resolves.toBeNull();
  });

  it("rejects a tampered token", async () => {
    const token = await signSessionToken(session, secret);
    const [header, , signature] = token.split(".");
    const forgedPayload = Buffer.from(JSON.stringify({ sub: "attacker" })).toString("base64url");
    await expect(verifySessionToken(`${header}.${forgedPayload}.${signature}`, secret)).resolves.toBeNull();
  });

  it("rejects an expired token", async () => {
    const issuedAt = 1_000_000;
    const token = await signSessionToken(session, secret, issuedAt);
    const afterExpiry = new Date((issuedAt + SESSION_DURATION_SECONDS + 1) * 1000);
    await expect(verifySessionToken(token, secret, afterExpiry)).resolves.toBeNull();
  });

  it("accepts a token right before it expires", async () => {
    const issuedAt = 1_000_000;
    const token = await signSessionToken(session, secret, issuedAt);
    const beforeExpiry = new Date((issuedAt + SESSION_DURATION_SECONDS - 60) * 1000);
    await expect(verifySessionToken(token, secret, beforeExpiry)).resolves.toEqual(session);
  });

  it("returns null when there is no cookie", async () => {
    await expect(verifySessionToken(undefined, secret)).resolves.toBeNull();
    await expect(verifySessionToken("not-a-jwt", secret)).resolves.toBeNull();
  });
});

describe("readSessionSecret", () => {
  it("rejects a missing or short secret", () => {
    expect(() => readSessionSecret({})).toThrow(/SESSION_SECRET/);
    expect(() => readSessionSecret({ SESSION_SECRET: "short" })).toThrow(/mínimo 32/);
  });
});
