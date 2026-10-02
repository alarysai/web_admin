// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { AdminNav, isActiveSection } from "./AdminNav";

let pathname = "/";
vi.mock("next/navigation", () => ({ usePathname: () => pathname }));

afterEach(cleanup);

describe("isActiveSection", () => {
  it.each([
    ["/", "/", true],
    ["/questionarios", "/", false],
    ["/questionarios", "/questionarios", true],
    ["/questionarios/abc", "/questionarios", true],
    ["/questionarios-antigos", "/questionarios", false],
  ])("%s in %s → %s", (path, href, expected) => {
    expect(isActiveSection(path, href)).toBe(expected);
  });
});

describe("AdminNav", () => {
  it("marks the current section", () => {
    pathname = "/questionarios/q1";
    render(<AdminNav />);
    expect(screen.getByRole("link", { name: "Questionários" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: "Início" })).not.toHaveAttribute("aria-current");
    expect(screen.getByRole("link", { name: "Categorias" })).toHaveAttribute("href", "/categorias");
  });
});
