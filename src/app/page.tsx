import { FirebaseStatus } from "@/components/FirebaseStatus";

export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 p-8 font-sans">
      <h1 className="text-3xl font-semibold tracking-tight">alarysai · web admin</h1>
      <FirebaseStatus />
    </main>
  );
}
