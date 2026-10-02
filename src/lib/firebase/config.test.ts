import { describe, expect, it } from "vitest";

import { normalizePrivateKey, parseAdminCredentials, parseFirebaseClientConfig } from "./config";

const validClientEnv = {
  apiKey: "key",
  authDomain: "alarysai.firebaseapp.com",
  projectId: "alarysai",
  storageBucket: "alarysai.firebasestorage.app",
  messagingSenderId: "123",
  appId: "1:123:web:abc",
};

describe("parseFirebaseClientConfig", () => {
  it("returns the config when every key is present", () => {
    expect(parseFirebaseClientConfig(validClientEnv)).toEqual(validClientEnv);
  });

  it("trims surrounding whitespace", () => {
    const config = parseFirebaseClientConfig({ ...validClientEnv, projectId: "  alarysai \n" });
    expect(config.projectId).toBe("alarysai");
  });

  it("lists every missing or blank key in the error", () => {
    expect(() =>
      parseFirebaseClientConfig({ ...validClientEnv, apiKey: undefined, appId: "   " }),
    ).toThrow(/apiKey, appId/);
  });
});

const PEM = "-----BEGIN PRIVATE KEY-----\nabc\n-----END PRIVATE KEY-----";
// As stored in an env var: literal backslash-n instead of line breaks.
const ESCAPED_PEM = "-----BEGIN PRIVATE KEY-----\nabc\n-----END PRIVATE KEY-----\n";

describe("parseAdminCredentials", () => {
  const validAdminEnv = {
    FIREBASE_PROJECT_ID: "alarysai",
    FIREBASE_CLIENT_EMAIL: "sa@alarysai.iam.gserviceaccount.com",
    FIREBASE_PRIVATE_KEY: ESCAPED_PEM,
  };

  it("converts escaped newlines in the private key", () => {
    expect(parseAdminCredentials(validAdminEnv).privateKey).toBe(PEM);
  });

  it("keeps a private key that already has real newlines", () => {
    const credentials = parseAdminCredentials({ ...validAdminEnv, FIREBASE_PRIVATE_KEY: PEM });
    expect(credentials.privateKey).toBe(PEM);
  });

  it("rejects a value that is not a PEM private key", () => {
    expect(() =>
      parseAdminCredentials({ ...validAdminEnv, FIREBASE_PRIVATE_KEY: "not-a-key" }),
    ).toThrow(/FIREBASE_PRIVATE_KEY inválida/);
  });

  it("lists every missing variable in the error", () => {
    expect(() => parseAdminCredentials({ FIREBASE_PROJECT_ID: "alarysai" })).toThrow(
      /FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY/,
    );
  });
});

describe("normalizePrivateKey", () => {
  it("returns undefined for missing or blank values", () => {
    expect(normalizePrivateKey(undefined)).toBeUndefined();
    expect(normalizePrivateKey("   ")).toBeUndefined();
  });

  it("strips the quotes and trailing comma copied from the JSON", () => {
    expect(normalizePrivateKey(`"${ESCAPED_PEM}",`)).toBe(PEM);
    expect(normalizePrivateKey(`'${ESCAPED_PEM}'`)).toBe(PEM);
  });

  it("converts Windows line endings", () => {
    expect(normalizePrivateKey(PEM.replace(/\n/g, "\r\n"))).toBe(PEM);
  });

  it("extracts private_key when the whole service account JSON was pasted", () => {
    const json = JSON.stringify({ type: "service_account", private_key: `${PEM}\n` });
    expect(normalizePrivateKey(json)).toBe(PEM);
  });
});
