import { AdminNav } from "@/components/layout/AdminNav";
import { LogoutButton } from "@/features/auth/presentation/LogoutButton";
import { requireAdmin } from "@/features/auth/server/current-admin";

/** Every page inside (painel) requires an active admin (see requireAdmin). */
export default async function PainelLayout({ children }: LayoutProps<"/">) {
  const admin = await requireAdmin();

  return (
    <div className="flex flex-1 flex-col font-sans">
      <header className="flex items-center justify-between border-b border-zinc-200 px-6 py-3">
        <span className="font-semibold">alarysai · web admin</span>
        <div className="flex items-center gap-3 text-sm text-zinc-600">
          <span>{admin.email ?? admin.uid}</span>
          <LogoutButton />
        </div>
      </header>
      <div className="flex flex-1">
        <aside className="w-52 shrink-0 border-r border-zinc-200 p-3">
          <AdminNav />
        </aside>
        <main className="flex flex-1 flex-col gap-6 p-6">{children}</main>
      </div>
    </div>
  );
}
