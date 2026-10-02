// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";

import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { AdminSignIn, SignInResult } from "../data/admin-sign-in";
import { LoginForm } from "./LoginForm";
import { LOGIN_ERROR_MESSAGES } from "./login-messages";

const router = { replace: vi.fn(), refresh: vi.fn() };
vi.mock("next/navigation", () => ({ useRouter: () => router }));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

async function submit(signIn: AdminSignIn, redirectTo = "/") {
  const user = userEvent.setup();
  render(<LoginForm redirectTo={redirectTo} signIn={signIn} />);
  await user.type(screen.getByLabelText("E-mail"), "  admin@alarys.com ");
  await user.type(screen.getByLabelText("Senha"), "segredo123");
  await user.click(screen.getByRole("button", { name: "Entrar" }));
}

describe("LoginForm", () => {
  it("signs in with the trimmed e-mail and goes to the requested page", async () => {
    const signIn = vi.fn<AdminSignIn>().mockResolvedValue({ ok: true });
    await submit(signIn, "/questionarios");

    expect(signIn).toHaveBeenCalledWith("admin@alarys.com", "segredo123");
    expect(router.replace).toHaveBeenCalledWith("/questionarios");
    expect(router.refresh).toHaveBeenCalled();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it.each(Object.entries(LOGIN_ERROR_MESSAGES))("shows the %s error and stays on the page", async (code, message) => {
    const signIn = vi.fn<AdminSignIn>().mockResolvedValue({ ok: false, error: code } as SignInResult);
    await submit(signIn);

    expect(await screen.findByRole("alert")).toHaveTextContent(message);
    expect(router.replace).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Entrar" })).toBeEnabled();
  });

  it("disables the button while signing in", async () => {
    let finish: (result: SignInResult) => void = () => {};
    const signIn = vi.fn<AdminSignIn>(() => new Promise((resolve) => (finish = resolve)));
    await submit(signIn);

    expect(screen.getByRole("button", { name: "Entrando…" })).toBeDisabled();
    finish({ ok: false, error: "unknown" });
    expect(await screen.findByRole("button", { name: "Entrar" })).toBeEnabled();
  });

  it("does not submit while the required fields are empty", async () => {
    const signIn = vi.fn<AdminSignIn>();
    const user = userEvent.setup();
    render(<LoginForm redirectTo="/" signIn={signIn} />);
    await user.click(screen.getByRole("button", { name: "Entrar" }));
    expect(signIn).not.toHaveBeenCalled();
  });
});
