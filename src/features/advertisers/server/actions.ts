"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getCurrentAdmin } from "@/features/auth/server/current-admin";
import type { ActionResult } from "@/lib/forms/action-result";
import { formSuccess, type FormState } from "@/lib/forms/form-state";

import {
  createAdvertiser,
  deleteAdvertiser,
  findAdvertiser,
  setAdvertiserStatus,
  updateAdvertiser,
} from "../data/advertisers-repository";
import { activateAdvertiser, deactivateAdvertiser, deleteAdvertiserById } from "./advertiser-lifecycle";
import { saveAdvertiser } from "./save-advertiser";

function revalidateAdvertisers(id?: string) {
  revalidatePath("/anunciantes");
  if (id) revalidatePath(`/anunciantes/${id}`);
}

/** Bound with the advertiser id (null = new) in AdvertiserForm. */
export async function saveAdvertiserAction(id: string | null, _previous: FormState, formData: FormData): Promise<FormState> {
  const result = await saveAdvertiser(id, formData, { getCurrentAdmin, create: createAdvertiser, update: updateAdvertiser });
  if (!result.ok) return result.state;

  revalidateAdvertisers(result.id);
  if (result.created) redirect(`/anunciantes/${result.id}?criado=1`);
  return formSuccess("Anunciante salvo.");
}

export async function activateAdvertiserAction(id: string): Promise<ActionResult> {
  const result = await activateAdvertiser(id, { getCurrentAdmin, findAdvertiser, setStatus: setAdvertiserStatus });
  if (result.ok) revalidateAdvertisers(id);
  return result;
}

export async function deactivateAdvertiserAction(id: string): Promise<ActionResult> {
  const result = await deactivateAdvertiser(id, { getCurrentAdmin, setStatus: setAdvertiserStatus });
  if (result.ok) revalidateAdvertisers(id);
  return result;
}

/** On success, goes back to the list (redirect); otherwise returns the error. */
export async function deleteAdvertiserAction(id: string): Promise<ActionResult> {
  const result = await deleteAdvertiserById(id, { getCurrentAdmin, remove: deleteAdvertiser });
  if (!result.ok) return result;
  revalidateAdvertisers();
  redirect("/anunciantes?excluido=1");
}
