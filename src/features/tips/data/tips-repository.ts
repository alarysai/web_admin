import "server-only";

import { FieldValue } from "firebase-admin/firestore";

import { completeLanguages } from "@/lib/content/localized-text";
import { asLocalizedText, asString } from "@/lib/content/firestore-mapping";
import { getAdminFirestore } from "@/lib/firebase/admin/firestore";

import type { Tip, TipInput, TipStatus, TipUsage } from "../domain/tip";
import { toTip } from "./tip-mapper";

export const TIPS_COLLECTION = "tips";

const collection = () => getAdminFirestore().collection(TIPS_COLLECTION);

export async function listTips(): Promise<Tip[]> {
  const snapshot = await collection().get();
  return snapshot.docs.map((doc) => toTip(doc.id, doc.data()));
}

export async function findTip(id: string): Promise<Tip | null> {
  if (!id) return null;
  const snapshot = await collection().doc(id).get();
  return snapshot.exists ? toTip(snapshot.id, snapshot.data()) : null;
}

/** New tips start inactive: they only reach the apps after "Ativar". */
export async function createTip(input: TipInput, adminUid: string): Promise<string> {
  const ref = await collection().add({
    ...input,
    image: null,
    languages: completeLanguages([input.text]),
    status: "inactive",
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
    createdBy: adminUid,
    updatedBy: adminUid,
  });
  return ref.id;
}

/** Returns false when the tip no longer exists. */
export async function updateTip(id: string, input: TipInput, adminUid: string): Promise<boolean> {
  const ref = collection().doc(id);
  if (!(await ref.get()).exists) return false;
  await ref.update({
    ...input,
    languages: completeLanguages([input.text]),
    updatedAt: FieldValue.serverTimestamp(),
    updatedBy: adminUid,
  });
  return true;
}

export async function setTipStatus(id: string, status: TipStatus, adminUid: string): Promise<boolean> {
  const ref = collection().doc(id);
  if (!(await ref.get()).exists) return false;
  await ref.update({ status, updatedAt: FieldValue.serverTimestamp(), updatedBy: adminUid });
  return true;
}

export async function deleteTip(id: string): Promise<boolean> {
  const ref = collection().doc(id);
  if (!(await ref.get()).exists) return false;
  await ref.delete();
  return true;
}

/**
 * Steps that link to the tip (info flag or an option), across all
 * questionnaires: `tipIds` array-contains, plus `infoFlag.tipId` for steps
 * saved before `tipIds` existed. Collection group queries; indexes in
 * firestore.indexes.json (fieldOverrides).
 */
export async function findTipUsages(tipId: string): Promise<TipUsage[]> {
  const steps = getAdminFirestore().collectionGroup("steps");
  const [byList, byInfoFlag] = await Promise.all([
    steps.where("tipIds", "array-contains", tipId).get(),
    steps.where("infoFlag.tipId", "==", tipId).get(),
  ]);
  const unique = new Map([...byList.docs, ...byInfoFlag.docs].map((doc) => [doc.ref.path, doc]));
  return Promise.all(
    [...unique.values()].map(async (step) => {
      const questionnaire = await step.ref.parent.parent!.get();
      const data = questionnaire.data() ?? {};
      return {
        questionnaireId: questionnaire.id,
        questionnaireTitle: asLocalizedText(data.title).pt || "(sem título)",
        published: asString(data.status) === "published",
        stepId: step.id,
      };
    }),
  );
}
