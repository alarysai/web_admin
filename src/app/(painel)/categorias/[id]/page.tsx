import { EditCategoryScreen } from "@/features/categories/presentation/CategoryScreens";

export default async function EditCategoryPage({ params }: PageProps<"/categorias/[id]">) {
  return <EditCategoryScreen kind="questionnaire" id={(await params).id} />;
}
