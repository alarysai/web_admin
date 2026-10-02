import { describe, expect, it } from "vitest";

import { parseAdminCredentials, parseFirebaseClientConfig } from "./config";

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

describe("parseAdminCredentials", () => {
  const validAdminEnv = {
    FIREBASE_PROJECT_ID: "alarysai",
    FIREBASE_CLIENT_EMAIL: "sa@alarysai.iam.gserviceaccount.com",
    FIREBASE_PRIVATE_KEY: "-----BEGIN PRIVATE KEY-----\\nabc\\n-----END PRIVATE KEY-----\\n",
  };

  it("converts escaped newlines in the private key", () => {
    const credentials = parseAdminCredentials(validAdminEnv);
    expect(credentials.privateKey).toBe(
      "-----BEGIN PRIVATE KEY-----\nabc\n-----END PRIVATE KEY-----",
    );
  });

  it("keeps a private key that already has real newlines", () => {
    const credentials = parseAdminCredentials({
      ...validAdminEnv,
      FIREBASE_PRIVATE_KEY: "line1\nline2",
    });
    expect(credentials.privateKey).toBe("line1\nline2");
  });

  it("lists every missing variable in the error", () => {
    expect(() => parseAdminCredentials({ FIREBASE_PROJECT_ID: "alarysai" })).toThrow(
      /FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY/,
    );
  });
});
