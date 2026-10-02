import "server-only";

import { FieldValue } from "firebase-admin/firestore";

import { completeLanguages } from "@/lib/content/localized-text";
import { getAdminFirestore } from "@/lib/firebase/admin/firestore";

import type { Questionnaire } from "../domain/questionnaire";
import type { QuestionnaireInput } from "../domain/schemas";
import { toQuestionnaire } from "./questionnaire-mapper";

export const QUESTIONNAIRES_COLLECTION = "questionnaires";

const collection = () => getAdminFirestore().collection(QUESTIONNAIRES_COLLECTION);

/** Languages fully translated in the questionnaire's own texts (steps join in with the step editor). */
function languagesOf(input: QuestionnaireInput) {
  return completeLanguages([input.title, input.description]);
}

export async function listQuestionnaires(): Promise<Questionnaire[]> {
  const snapshot = await collection().get();
  return snapshot.docs.map((doc) => toQuestionnaire(doc.id, doc.data()));
}

export async function findQuestionnaire(id: string): Promise<Questionnaire | null> {
  const snapshot = await collection().doc(id).get();
  return snapshot.exists ? toQuestionnaire(snapshot.id, snapshot.data()) : null;
}

/** New questionnaires always start as drafts. */
export async function createQuestionnaire(input: QuestionnaireInput, adminUid: string): Promise<string> {
  const ref = await collection().add({
    ...input,
    image: null,
    languages: languagesOf(input),
    status: "draft",
    publishedAt: null,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
    createdBy: adminUid,
    updatedBy: adminUid,
  });
  return ref.id;
}

/** Returns false when the questionnaire no longer exists. */
export async function updateQuestionnaire(id: string, input: QuestionnaireInput, adminUid: string): Promise<boolean> {
  const ref = collection().doc(id);
  if (!(await ref.get()).exists) return false;
  await ref.update({
    ...input,
    languages: languagesOf(input),
    updatedAt: FieldValue.serverTimestamp(),
    updatedBy: adminUid,
  });
  return true;
}
