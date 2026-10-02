import { FirebaseError } from "firebase/app";
import { describe, expect, it } from "vitest";

import { toSignInErrorCode } from "./admin-sign-in";

describe("toSignInErrorCode", () => {
  it.each([
    ["auth/invalid-credential", "invalid-credentials"],
    ["auth/invalid-email", "invalid-credentials"],
    ["auth/user-disabled", "invalid-credentials"],
    ["auth/too-many-requests", "too-many-requests"],
    ["auth/network-request-failed", "network"],
    ["auth/internal-error", "unknown"],
  ])("maps %s to %s", (code, expected) => {
    expect(toSignInErrorCode(new FirebaseError(code, "msg"))).toBe(expected);
  });

  it("treats a failed fetch as a network error", () => {
    expect(toSignInErrorCode(new TypeError("Failed to fetch"))).toBe("network");
  });

  it("treats anything else as unknown", () => {
    expect(toSignInErrorCode(new Error("boom"))).toBe("unknown");
    expect(toSignInErrorCode("boom")).toBe("unknown");
  });
});
