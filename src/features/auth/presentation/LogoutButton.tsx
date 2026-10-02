"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { signOutAdmin } from "../data/admin-sign-in";

type LogoutButtonProps = {
  signOut?: () => Promise<void>;
};

export function LogoutButton({ signOut = signOutAdmin }: LogoutButtonProps) {
  const router = useRouter();
  const [leaving, setLeaving] = useState(false);

  async function handleClick() {
    setLeaving(true);
    try {
      await signOut();
    } catch (error) {
      // Leave anyway: the panel layout re-checks the session on the next request.
      console.error("[logout] failed", error);
    }
    router.replace("/login");
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={leaving}
      className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm disabled:opacity-60"
    >
      {leaving ? "Saindo…" : "Sair"}
    </button>
  );
}
