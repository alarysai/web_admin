import "server-only";

import { FieldValue } from "firebase-admin/firestore";

import { getAdminFirestore } from "@/lib/firebase/admin/firestore";

import type { Advertiser, AdvertiserInput, AdvertiserStatus } from "../domain/advertiser";
import { toAdvertiser } from "./advertiser-mapper";

export const ADVERTISERS_COLLECTION = "advertisers";

const collection = () => getAdminFirestore().collection(ADVERTISERS_COLLECTION);

export async function listAdvertisers(): Promise<Advertiser[]> {
  const snapshot = await collection().get();
  return snapshot.docs.map((doc) => toAdvertiser(doc.id, doc.data()));
}

export async function findAdvertiser(id: string): Promise<Advertiser | null> {
  if (!id) return null;
  const snapshot = await collection().doc(id).get();
  return snapshot.exists ? toAdvertiser(snapshot.id, snapshot.data()) : null;
}

/** New advertisers start inactive: they only reach the apps after "Ativar". */
export async function createAdvertiser(input: AdvertiserInput, adminUid: string): Promise<string> {
  const ref = await collection().add({
    ...input,
    status: "inactive",
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
    createdBy: adminUid,
    updatedBy: adminUid,
  });
  return ref.id;
}

/**
 * Returns false when the advertiser no longer exists. The image is not in the
 * form yet (no uploads), so an existing one is kept instead of being cleared.
 */
export async function updateAdvertiser(id: string, input: AdvertiserInput, adminUid: string): Promise<boolean> {
  const ref = collection().doc(id);
  if (!(await ref.get()).exists) return false;
  const { image, ...fields } = input;
  await ref.update({ ...fields, ...(image ? { image } : {}), updatedAt: FieldValue.serverTimestamp(), updatedBy: adminUid });
  return true;
}

export async function setAdvertiserStatus(id: string, status: AdvertiserStatus, adminUid: string): Promise<boolean> {
  const ref = collection().doc(id);
  if (!(await ref.get()).exists) return false;
  await ref.update({ status, updatedAt: FieldValue.serverTimestamp(), updatedBy: adminUid });
  return true;
}

export async function deleteAdvertiser(id: string): Promise<boolean> {
  const ref = collection().doc(id);
  if (!(await ref.get()).exists) return false;
  await ref.delete();
  return true;
}
