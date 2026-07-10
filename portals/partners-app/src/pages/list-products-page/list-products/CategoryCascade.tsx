import { AdminCategorySelect, type AdminCategoryValue } from '@duncit/category';

export interface CategoryErrors {
  super?: string;
  category?: string;
  sub?: string;
}

interface Props {
  superId: string;
  categoryId: string;
  subId: string;
  errors?: CategoryErrors;
  onChange: (next: { superId: string; categoryId: string; subId: string }) => void;
}

// Step 1 of the wizard: pick the Super → Category → Sub the product is sold in.
// Backed by the shared @duncit/category tree (same taxonomy pods use) so the
// selection stays in sync with admin. Persisted with the product as the three
// category ids. Selecting a parent resets the levels below it.
export default function CategoryCascade({ superId, categoryId, subId, errors, onChange }: Readonly<Props>) {
  const value: AdminCategoryValue = {
    super_id: superId,
    super_name: '',
    category_id: categoryId,
    category_name: '',
    sub_id: subId,
    sub_name: '',
  };
  return (
    <AdminCategorySelect
      value={value}
      onChange={(next) => onChange({ superId: next.super_id, categoryId: next.category_id, subId: next.sub_id })}
      required
      size="medium"
      errors={errors}
      legend="Which category do you want to sell your product in?"
      hint="Pick the Super category, Category and Sub category your product belongs to. This decides the pods it can be added to."
    />
  );
}
