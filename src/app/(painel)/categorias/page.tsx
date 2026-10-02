import { CategoryListScreen } from "@/features/categories/presentation/CategoryScreens";

export default async function CategoriesPage({ searchParams }: PageProps<"/categorias">) {
  return <CategoryListScreen kind="questionnaire" justCreated={(await searchParams).criada === "1"} />;
}
