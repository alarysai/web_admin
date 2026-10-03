import "server-only";

import { FieldValue } from "firebase-admin/firestore";

import { getAdminFirestore } from "@/lib/firebase/admin/firestore";

import type { Step } from "../domain/schemas";
import { clearJumpsTo, questionnaireLanguages, sortSteps, stepTipIds, type StepRecord } from "../domain/steps";
import { QUESTIONNAIRES_COLLECTION } from "./questionnaires-repository";
import { toQuestionnaire } from "./questionnaire-mapper";
import { toStep } from "./step-mapper";

export const STEPS_SUBCOLLECTION = "steps";

const questionnaireRef = (questionnaireId: string) =>
  getAdminFirestore().collection(QUESTIONNAIRES_COLLECTION).doc(questionnaireId);
const stepsRef = (questionnaireId: string) => questionnaireRef(questionnaireId).collection(STEPS_SUBCOLLECTION);

export async function listSteps(questionnaireId: string): Promise<StepRecord[]> {
  const snapshot = await stepsRef(questionnaireId).get();
  return sortSteps(snapshot.docs.map((doc) => toStep(doc.id, doc.data())));
}

/**
 * Recomputes `questionnaires.languages` from the questionnaire and all its
 * steps. Called after every step write so the list shows the real coverage.
 */
export async function refreshQuestionnaireLanguages(questionnaireId: string): Promise<void> {
  const [questionnaireSnapshot, steps] = await Promise.all([questionnaireRef(questionnaireId).get(), listSteps(questionnaireId)]);
  if (!questionnaireSnapshot.exists) return;
  const questionnaire = toQuestionnaire(questionnaireSnapshot.id, questionnaireSnapshot.data());
  await questionnaireRef(questionnaireId).update({ languages: questionnaireLanguages(questionnaire, steps) });
}

/**
 * What is stored for a step: its fields plus `tipIds`, every tip it links to
 * (info flag + options). Panel-maintained, so "where is this tip used?" can be
 * one array-contains query (option tips sit inside `options[]`, which the
 * Firestore cannot query). The apps can ignore it.
 */
export function stepDocument(step: Step) {
  return { ...step, tipIds: stepTipIds(step) };
}

export async function createStep(questionnaireId: string, step: Step, adminUid: string): Promise<string> {
  const ref = await stepsRef(questionnaireId).add({
    ...stepDocument(step),
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
    createdBy: adminUid,
    updatedBy: adminUid,
  });
  await touchQuestionnaire(questionnaireId, adminUid);
  return ref.id;
}

/** Returns false when the step no longer exists. */
export async function updateStep(questionnaireId: string, stepId: string, step: Step, adminUid: string): Promise<boolean> {
  const ref = stepsRef(questionnaireId).doc(stepId);
  if (!(await ref.get()).exists) return false;
  await ref.update({ ...stepDocument(step), updatedAt: FieldValue.serverTimestamp(), updatedBy: adminUid });
  await touchQuestionnaire(questionnaireId, adminUid);
  return true;
}

/** Deletes the step and resets jumps that pointed to it, in one batch. */
export async function deleteStep(questionnaireId: string, stepId: string, adminUid: string): Promise<boolean> {
  const ref = stepsRef(questionnaireId).doc(stepId);
  if (!(await ref.get()).exists) return false;

  const patches = clearJumpsTo(stepId, await listSteps(questionnaireId));
  const batch = getAdminFirestore().batch();
  batch.delete(ref);
  for (const patch of patches) {
    batch.update(stepsRef(questionnaireId).doc(patch.stepId), {
      nextStepId: patch.nextStepId,
      options: patch.options,
      updatedAt: FieldValue.serverTimestamp(),
      updatedBy: adminUid,
    });
  }
  await batch.commit();
  await touchQuestionnaire(questionnaireId, adminUid);
  return true;
}

async function touchQuestionnaire(questionnaireId: string, adminUid: string) {
  await questionnaireRef(questionnaireId).update({ updatedAt: FieldValue.serverTimestamp(), updatedBy: adminUid });
  await refreshQuestionnaireLanguages(questionnaireId);
}
