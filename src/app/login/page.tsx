import { redirect } from "next/navigation";

import { safeRedirectPath } from "@/features/auth/domain/safe-redirect";
import { LoginForm } from "@/features/auth/presentation/LoginForm";
import { getCurrentAdmin } from "@/features/auth/server/current-admin";

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const redirectTo = safeRedirectPath((await searchParams).next);
  if (await getCurrentAdmin()) redirect(redirectTo);

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 p-8 font-sans">
      <div className="text-center">
        <h1 className="text-2xl font-semibold tracking-tight">alarysai · web admin</h1>
        <p className="text-sm text-zinc-500">Acesso restrito a administradores</p>
      </div>
      <LoginForm redirectTo={redirectTo} />
    </main>
  );
}
