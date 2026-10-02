import "server-only";

import { FieldValue } from "firebase-admin/firestore";

import { getAdminFirestore } from "@/lib/firebase/admin/firestore";

import type { Category, CategoryInput, CategoryKind } from "../domain/category";
import { toCategory } from "./category-mapper";

export const CATEGORY_COLLECTIONS: Record<CategoryKind, string> = {
  questionnaire: "questionnaireCategories",
  tip: "tipCategories",
};

const collection = (kind: CategoryKind) => getAdminFirestore().collection(CATEGORY_COLLECTIONS[kind]);

export async function listCategories(kind: CategoryKind): Promise<Category[]> {
  const snapshot = await collection(kind).get();
  return snapshot.docs.map((doc) => toCategory(doc.id, doc.data()));
}

export async function findCategory(kind: CategoryKind, id: string): Promise<Category | null> {
  if (!id) return null;
  const snapshot = await collection(kind).doc(id).get();
  return snapshot.exists ? toCategory(snapshot.id, snapshot.data()) : null;
}

export async function createCategory(kind: CategoryKind, input: CategoryInput, adminUid: string): Promise<string> {
  const ref = await collection(kind).add({
    ...input,
    ...(kind === "questionnaire" ? { icon: null } : {}),
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
    createdBy: adminUid,
    updatedBy: adminUid,
  });
  return ref.id;
}

/** Returns false when the category no longer exists. */
export async function updateCategory(kind: CategoryKind, id: string, input: CategoryInput, adminUid: string): Promise<boolean> {
  const ref = collection(kind).doc(id);
  if (!(await ref.get()).exists) return false;
  await ref.update({ ...input, updatedAt: FieldValue.serverTimestamp(), updatedBy: adminUid });
  return true;
}
