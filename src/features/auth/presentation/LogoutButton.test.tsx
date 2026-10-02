// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";

import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { LogoutButton } from "./LogoutButton";

const router = { replace: vi.fn(), refresh: vi.fn() };
vi.mock("next/navigation", () => ({ useRouter: () => router }));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("LogoutButton", () => {
  it("signs out and goes to /login", async () => {
    const signOut = vi.fn().mockResolvedValue(undefined);
    render(<LogoutButton signOut={signOut} />);
    await userEvent.setup().click(screen.getByRole("button", { name: "Sair" }));

    expect(signOut).toHaveBeenCalledOnce();
    expect(router.replace).toHaveBeenCalledWith("/login");
  });

  it("still goes to /login when signing out fails", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const signOut = vi.fn().mockRejectedValue(new Error("offline"));

    render(<LogoutButton signOut={signOut} />);
    await userEvent.setup().click(screen.getByRole("button", { name: "Sair" }));

    await waitFor(() => expect(router.replace).toHaveBeenCalledWith("/login"));
  });
});
