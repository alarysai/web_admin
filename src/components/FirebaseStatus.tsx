"use client";

import { getFirebaseApp } from "@/lib/firebase/client";

type Status = { state: "ok"; projectId: string } | { state: "error"; message: string };

function readFirebaseStatus(): Status {
  try {
    return { state: "ok", projectId: getFirebaseApp().options.projectId ?? "desconhecido" };
  } catch (error) {
    return { state: "error", message: (error as Error).message };
  }
}

/** Shows whether the browser SDK initialized and which Firebase project it targets. */
export function FirebaseStatus() {
  const status = readFirebaseStatus();

  if (status.state === "error") return <p className="text-red-600">{status.message}</p>;
  return (
    <p className="text-green-700">
      Firebase conectado ao projeto <code className="font-mono">{status.projectId}</code>
    </p>
  );
}
