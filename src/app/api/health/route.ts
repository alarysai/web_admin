import { getAdminFirestore } from "@/lib/firebase/admin";

/**
 * GET /api/health — confirms the server (local or Vercel) reaches Firestore
 * through the Admin SDK. Returns no data from the database.
 */
export async function GET() {
  try {
    await getAdminFirestore().listCollections();
    return Response.json({ firebase: "ok" });
  } catch (error) {
    console.error("[health] Firebase Admin check failed", error);
    return Response.json({ firebase: "error" }, { status: 503 });
  }
}
