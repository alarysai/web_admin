import { EditCategoryScreen } from "@/features/categories/presentation/CategoryScreens";

export default async function EditCategoryPage({ params }: PageProps<"/categorias-dicas/[id]">) {
  return <EditCategoryScreen kind="tip" id={(await params).id} />;
}
