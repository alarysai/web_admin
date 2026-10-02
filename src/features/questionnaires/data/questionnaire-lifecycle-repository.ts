import "server-only";

import { FieldValue, type WriteBatch } from "firebase-admin/firestore";

import { asLocalizedText } from "@/lib/content/firestore-mapping";
import { getAdminFirestore } from "@/lib/firebase/admin/firestore";

import { copyTitle, duplicateSteps } from "../domain/lifecycle";
import type { QuestionnaireStatus } from "../domain/schemas";
import { QUESTIONNAIRES_COLLECTION } from "./questionnaires-repository";
import { listSteps, refreshQuestionnaireLanguages, STEPS_SUBCOLLECTION } from "./steps-repository";

/** Firestore batches take at most 500 writes; stay below it. */
const BATCH_LIMIT = 450;

const collection = () => getAdminFirestore().collection(QUESTIONNAIRES_COLLECTION);

async function commitInChunks(writes: Array<(batch: WriteBatch) => void>) {
  for (let start = 0; start < writes.length; start += BATCH_LIMIT) {
    const batch = getAdminFirestore().batch();
    writes.slice(start, start + BATCH_LIMIT).forEach((write) => write(batch));
    await batch.commit();
  }
}

/** Publish or unpublish. Publishing stamps publishedAt and refreshes the languages. */
export async function setQuestionnaireStatus(id: string, status: QuestionnaireStatus, adminUid: string): Promise<boolean> {
  const ref = collection().doc(id);
  if (!(await ref.get()).exists) return false;
  await ref.update({
    status,
    ...(status === "published" ? { publishedAt: FieldValue.serverTimestamp() } : {}),
    updatedAt: FieldValue.serverTimestamp(),
    updatedBy: adminUid,
  });
  if (status === "published") await refreshQuestionnaireLanguages(id);
  return true;
}

/** Copies the questionnaire and its steps as a new draft. Returns the new id, or null if the source is gone. */
export async function duplicateQuestionnaire(id: string, adminUid: string): Promise<string | null> {
  const source = await collection().doc(id).get();
  if (!source.exists) return null;

  const data = source.data() ?? {};
  const copyRef = collection().doc();
  const stepsRef = copyRef.collection(STEPS_SUBCOLLECTION);
  const steps = duplicateSteps(await listSteps(id), () => stepsRef.doc().id);
  const audit = {
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
    createdBy: adminUid,
    updatedBy: adminUid,
  };

  await commitInChunks([
    (batch) =>
      batch.set(copyRef, {
        ...data,
        title: copyTitle(asLocalizedText(data.title)),
        status: "draft",
        publishedAt: null,
        ...audit,
      }),
    ...steps.map(({ id: stepId, ...step }) => (batch: WriteBatch) => batch.set(stepsRef.doc(stepId), { ...step, ...audit })),
  ]);
  return copyRef.id;
}

/** Deletes the questionnaire and its steps (Firestore does not delete subcollections on its own). */
export async function deleteQuestionnaireWithSteps(id: string): Promise<boolean> {
  const ref = collection().doc(id);
  if (!(await ref.get()).exists) return false;
  const steps = await ref.collection(STEPS_SUBCOLLECTION).listDocuments();
  // Steps first: if a chunk fails, the questionnaire (and the retry button) is still there.
  await commitInChunks([...steps.map((step) => (batch: WriteBatch) => batch.delete(step)), (batch) => batch.delete(ref)]);
  return true;
}
