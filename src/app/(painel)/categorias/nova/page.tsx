import { PageHeader } from "@/components/layout/PageHeader";
import { CategoryForm } from "@/features/questionnaire-categories/presentation/CategoryForm";
import { saveCategoryAction } from "@/features/questionnaire-categories/server/actions";

export default function NewCategoryPage() {
  return (
    <>
      <PageHeader title="Nova categoria" />
      <CategoryForm category={null} action={saveCategoryAction.bind(null, null)} />
    </>
  );
}
