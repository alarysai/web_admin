import { describe, expect, it } from "vitest";

import { toAdminRecord } from "./admins-repository";

describe("toAdminRecord", () => {
  it("maps an active admin", () => {
    expect(toAdminRecord("uid-1", { email: "admin@alarys.com", active: true })).toEqual({
      uid: "uid-1",
      email: "admin@alarys.com",
      active: true,
    });
  });

  it("returns null when the document does not exist", () => {
    expect(toAdminRecord("uid-1", undefined)).toBeNull();
  });

  it.each([[{}], [{ active: false }], [{ active: "true" }], [{ active: 1 }], [{ active: null }]])(
    "treats %j as inactive",
    (data) => {
      expect(toAdminRecord("uid-1", data)?.active).toBe(false);
    },
  );

  it("tolerates a missing or non-text email", () => {
    expect(toAdminRecord("uid-1", { active: true, email: 42 })?.email).toBeNull();
  });
});
