import "server-only";

import { FieldValue } from "firebase-admin/firestore";

import { getAdminFirestore } from "@/lib/firebase/admin/firestore";

import type { CategoryInput, QuestionnaireCategory } from "../domain/category";
import { toCategory } from "./category-mapper";

export const CATEGORIES_COLLECTION = "questionnaireCategories";

const collection = () => getAdminFirestore().collection(CATEGORIES_COLLECTION);

export async function listCategories(): Promise<QuestionnaireCategory[]> {
  const snapshot = await collection().get();
  return snapshot.docs.map((doc) => toCategory(doc.id, doc.data()));
}

export async function findCategory(id: string): Promise<QuestionnaireCategory | null> {
  const snapshot = await collection().doc(id).get();
  return snapshot.exists ? toCategory(snapshot.id, snapshot.data()) : null;
}

export async function createCategory(input: CategoryInput, adminUid: string): Promise<string> {
  const ref = await collection().add({
    ...input,
    icon: null,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
    createdBy: adminUid,
    updatedBy: adminUid,
  });
  return ref.id;
}

/** Returns false when the category no longer exists. */
export async function updateCategory(id: string, input: CategoryInput, adminUid: string): Promise<boolean> {
  const ref = collection().doc(id);
  if (!(await ref.get()).exists) return false;
  await ref.update({ ...input, updatedAt: FieldValue.serverTimestamp(), updatedBy: adminUid });
  return true;
}

