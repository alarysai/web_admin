"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getCurrentAdmin } from "@/features/auth/server/current-admin";
import { formSuccess, type FormState } from "@/lib/forms/form-state";

import { createCategory, updateCategory } from "../data/categories-repository";
import { saveCategory } from "./save-category";

/** Bound with the category id (null = new) in CategoryForm. */
export async function saveCategoryAction(id: string | null, _previous: FormState, formData: FormData): Promise<FormState> {
  const result = await saveCategory(id, formData, {
    getCurrentAdmin,
    create: createCategory,
    update: updateCategory,
  });

  if (!result.ok) return result.state;

  // Categories show up in the questionnaire list, filter and form too.
  revalidatePath("/categorias");
  revalidatePath("/questionarios", "layout");
  if (result.created) redirect("/categorias?criada=1");
  return formSuccess("Categoria salva.");
}
