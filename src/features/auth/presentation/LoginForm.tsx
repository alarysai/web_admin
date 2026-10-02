"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import { signInAdmin, type AdminSignIn } from "../data/admin-sign-in";
import { LOGIN_ERROR_MESSAGES } from "./login-messages";

type LoginUiState =
  | { status: "idle" }
  | { status: "submitting" }
  | { status: "error"; message: string };

type LoginFormProps = {
  redirectTo: string;
  signIn?: AdminSignIn;
};

export function LoginForm({ redirectTo, signIn = signInAdmin }: LoginFormProps) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [uiState, setUiState] = useState<LoginUiState>({ status: "idle" });
  const submitting = uiState.status === "submitting";

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setUiState({ status: "submitting" });

    const result = await signIn(email.trim(), password);
    if (result.ok) {
      router.replace(redirectTo);
      router.refresh();
      return;
    }
    setUiState({ status: "error", message: LOGIN_ERROR_MESSAGES[result.error] });
  }

  return (
    <form onSubmit={handleSubmit} className="flex w-full max-w-sm flex-col gap-4">
      <label className="flex flex-col gap-1 text-sm font-medium">
        E-mail
        <input
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          className="rounded-md border border-zinc-300 px-3 py-2 font-normal"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm font-medium">
        Senha
        <input
          type="password"
          required
          autoComplete="current-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          className="rounded-md border border-zinc-300 px-3 py-2 font-normal"
        />
      </label>

      {uiState.status === "error" && (
        <p role="alert" className="text-sm text-red-600">
          {uiState.message}
        </p>
      )}

      <button
        type="submit"
        disabled={submitting}
        className="rounded-md bg-zinc-900 px-4 py-2 font-medium text-white disabled:opacity-60"
      >
        {submitting ? "Entrando…" : "Entrar"}
      </button>
    </form>
  );
}
