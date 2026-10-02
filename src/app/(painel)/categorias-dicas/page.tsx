import { CategoryListScreen } from "@/features/categories/presentation/CategoryScreens";

export default async function CategoriesPage({ searchParams }: PageProps<"/categorias-dicas">) {
  return <CategoryListScreen kind="tip" justCreated={(await searchParams).criada === "1"} />;
}
