import { FirebaseStatus } from "@/components/FirebaseStatus";

export default function DashboardPage() {
  return (
    <>
      <h1 className="text-2xl font-semibold tracking-tight">Painel</h1>
      <FirebaseStatus />
    </>
  );
}
