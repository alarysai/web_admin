import { describe, expect, it } from "vitest";

import { safeRedirectPath } from "./safe-redirect";

describe("safeRedirectPath", () => {
  it.each([
    ["/questionarios", "/questionarios"],
    ["/questionarios?categoria=etica", "/questionarios?categoria=etica"],
    [["/anunciantes", "/outro"], "/anunciantes"],
  ])("keeps the same-site path %j", (input, expected) => {
    expect(safeRedirectPath(input)).toBe(expected);
  });

  it.each([
    [undefined],
    [null],
    [""],
    ["https://evil.example"],
    ["//evil.example"],
    ["/\\evil.example"],
    ["painel"],
    ["/login"],
    ["/login?next=/x"],
  ])("falls back to / for %j", (input) => {
    expect(safeRedirectPath(input)).toBe("/");
  });
});
