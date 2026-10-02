import { createLocalJWKSet, exportJWK, generateKeyPair, SignJWT, type JWTVerifyGetKey } from "jose";
import { beforeAll, describe, expect, it } from "vitest";

import { verifyFirebaseIdToken } from "./firebase-id-token";

const PROJECT_ID = "alarysai-b6e85";
const KEY_ID = "test-key";

let privateKey: CryptoKey;
let keys: JWTVerifyGetKey;

beforeAll(async () => {
  const pair = await generateKeyPair("RS256");
  privateKey = pair.privateKey;
  const jwk = { ...(await exportJWK(pair.publicKey)), kid: KEY_ID, alg: "RS256" };
  keys = createLocalJWKSet({ keys: [jwk] });
});

type TokenOptions = {
  projectId?: string;
  issuer?: string;
  authTime?: number;
  expiresIn?: string;
  subject?: string;
};

function nowSeconds() {
  return Math.floor(Date.now() / 1000);
}

async function idToken(options: TokenOptions = {}) {
  const projectId = options.projectId ?? PROJECT_ID;
  return new SignJWT({ email: "admin@alarys.com", auth_time: options.authTime ?? nowSeconds() - 10 })
    .setProtectedHeader({ alg: "RS256", kid: KEY_ID })
    .setIssuer(options.issuer ?? `https://securetoken.google.com/${projectId}`)
    .setAudience(projectId)
    .setSubject(options.subject ?? "uid-1")
    .setIssuedAt()
    .setExpirationTime(options.expiresIn ?? "1h")
    .sign(privateKey);
}

describe("verifyFirebaseIdToken", () => {
  it("returns uid and email for a valid token", async () => {
    await expect(verifyFirebaseIdToken(await idToken(), PROJECT_ID, keys)).resolves.toEqual({
      uid: "uid-1",
      email: "admin@alarys.com",
    });
  });

  it("rejects a token from another Firebase project", async () => {
    const token = await idToken({ projectId: "alarysai" });
    await expect(verifyFirebaseIdToken(token, PROJECT_ID, keys)).rejects.toThrow();
  });

  it("rejects a token with the wrong issuer", async () => {
    const token = await idToken({ issuer: "https://evil.example" });
    await expect(verifyFirebaseIdToken(token, PROJECT_ID, keys)).rejects.toThrow();
  });

  it("rejects an expired token", async () => {
    const token = await idToken({ expiresIn: "-1m" });
    await expect(verifyFirebaseIdToken(token, PROJECT_ID, keys)).rejects.toThrow();
  });

  it("rejects an auth_time in the future", async () => {
    const token = await idToken({ authTime: nowSeconds() + 3600 });
    await expect(verifyFirebaseIdToken(token, PROJECT_ID, keys)).rejects.toThrow(/auth_time/);
  });

  it("rejects a token signed by an unknown key", async () => {
    const other = await generateKeyPair("RS256");
    const token = await new SignJWT({ auth_time: nowSeconds() })
      .setProtectedHeader({ alg: "RS256", kid: KEY_ID })
      .setIssuer(`https://securetoken.google.com/${PROJECT_ID}`)
      .setAudience(PROJECT_ID)
      .setSubject("uid-1")
      .setExpirationTime("1h")
      .sign(other.privateKey);
    await expect(verifyFirebaseIdToken(token, PROJECT_ID, keys)).rejects.toThrow();
  });
});
