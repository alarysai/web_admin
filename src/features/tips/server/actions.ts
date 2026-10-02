"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getCurrentAdmin } from "@/features/auth/server/current-admin";
import { findCategory } from "@/features/categories/data/categories-repository";
import type { ActionResult } from "@/lib/forms/action-result";
import { formSuccess, type FormState } from "@/lib/forms/form-state";

import { createTip, deleteTip, findTip, findTipUsages, setTipStatus, updateTip } from "../data/tips-repository";
import { saveTip } from "./save-tip";
import { activateTip, deactivateTip, deleteTipById } from "./tip-lifecycle";

function revalidateTips(id?: string) {
  revalidatePath("/dicas");
  if (id) revalidatePath(`/dicas/${id}`);
  // Step editors list tips for the info flag link.
  revalidatePath("/questionarios", "layout");
}

/** Bound with the tip id (null = new) in TipForm. */
export async function saveTipAction(id: string | null, _previous: FormState, formData: FormData): Promise<FormState> {
  const result = await saveTip(id, formData, {
    getCurrentAdmin,
    categoryExists: async (categoryId) => (await findCategory("tip", categoryId)) !== null,
    create: createTip,
    update: updateTip,
  });

  if (!result.ok) return result.state;

  revalidateTips(result.id);
  if (result.created) redirect(`/dicas/${result.id}?criada=1`);
  return formSuccess("Dica salva.");
}

export async function activateTipAction(id: string): Promise<ActionResult> {
  const result = await activateTip(id, {
    getCurrentAdmin,
    findTip,
    categoryState: async (categoryId) => {
      const category = await findCategory("tip", categoryId);
      return { exists: category !== null, active: category?.status === "active" };
    },
    setStatus: setTipStatus,
  });
  if (result.ok) revalidateTips(id);
  return result;
}

export async function deactivateTipAction(id: string): Promise<ActionResult> {
  const result = await deactivateTip(id, { getCurrentAdmin, findUsages: findTipUsages, setStatus: setTipStatus });
  if (result.ok) revalidateTips(id);
  return result;
}

/** On success, goes back to the list (redirect); otherwise returns what blocks it. */
export async function deleteTipAction(id: string): Promise<ActionResult> {
  const result = await deleteTipById(id, { getCurrentAdmin, findUsages: findTipUsages, remove: deleteTip });
  if (!result.ok) return result;
  revalidateTips();
  redirect("/dicas?excluida=1");
}
