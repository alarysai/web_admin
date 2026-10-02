import { describe, expect, it, vi } from "vitest";

import type { AdminRecord } from "./admin-session";
import { createAdminSession, type CreateAdminSessionDeps } from "./create-admin-session";

const identity = { uid: "uid-1", email: "admin@alarys.com" };

function deps(overrides: Partial<CreateAdminSessionDeps> = {}): CreateAdminSessionDeps {
  return {
    verifyIdToken: vi.fn().mockResolvedValue(identity),
    findAdmin: vi.fn().mockResolvedValue({ ...identity, active: true } satisfies AdminRecord),
    ...overrides,
  };
}

describe("createAdminSession", () => {
  it("creates a session for an active admin", async () => {
    await expect(createAdminSession("token", deps())).resolves.toEqual({
      status: "ok",
      session: identity,
    });
  });

  it("rejects a blank token without calling Firebase", async () => {
    const d = deps();
    await expect(createAdminSession("  ", d)).resolves.toEqual({ status: "invalid-token" });
    expect(d.verifyIdToken).not.toHaveBeenCalled();
  });

  it("rejects a token that fails verification", async () => {
    const d = deps({ verifyIdToken: vi.fn().mockRejectedValue(new Error("expired")) });
    await expect(createAdminSession("token", d)).resolves.toEqual({ status: "invalid-token" });
    expect(d.findAdmin).not.toHaveBeenCalled();
  });

  it("rejects a user without an admins entry", async () => {
    const d = deps({ findAdmin: vi.fn().mockResolvedValue(null) });
    await expect(createAdminSession("token", d)).resolves.toEqual({ status: "not-admin" });
  });

  it("rejects an inactive admin", async () => {
    const d = deps({ findAdmin: vi.fn().mockResolvedValue({ ...identity, active: false }) });
    await expect(createAdminSession("token", d)).resolves.toEqual({ status: "not-admin" });
  });

  it("looks the admin up by the uid from the verified token", async () => {
    const d = deps();
    await createAdminSession("token", d);
    expect(d.findAdmin).toHaveBeenCalledWith("uid-1");
  });
});
