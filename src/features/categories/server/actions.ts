"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getCurrentAdmin } from "@/features/auth/server/current-admin";
import { formSuccess, type FormState } from "@/lib/forms/form-state";

import { createCategory, updateCategory } from "../data/categories-repository";
import { CATEGORY_KINDS, type CategoryKind } from "../domain/category";
import { CATEGORY_SECTIONS } from "../presentation/category-sections";
import { saveCategory } from "./save-category";

/** Bound with (kind, category id | null) in CategoryForm. */
export async function saveCategoryAction(
  kind: CategoryKind,
  id: string | null,
  _previous: FormState,
  formData: FormData,
): Promise<FormState> {
  // `kind` arrives from the client: never trust it to pick a collection unchecked.
  if (!CATEGORY_KINDS.includes(kind)) throw new Error(`Unknown category kind: ${kind}`);

  const result = await saveCategory(id, formData, {
    getCurrentAdmin,
    create: (input, adminUid) => createCategory(kind, input, adminUid),
    update: (categoryId, input, adminUid) => updateCategory(kind, categoryId, input, adminUid),
  });

  if (!result.ok) return result.state;

  const section = CATEGORY_SECTIONS[kind];
  // Categories also show up in the lists, filters and forms of what uses them.
  revalidatePath(section.basePath);
  revalidatePath(section.usedBy, "layout");
  if (result.created) redirect(`${section.basePath}?criada=1`);
  return formSuccess("Categoria salva.");
}
