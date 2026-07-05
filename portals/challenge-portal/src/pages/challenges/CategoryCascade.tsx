import { AdminCategorySelect, type AdminCategoryValue } from '@duncit/category';

export interface CascadeValue {
  superId: string;
  categoryId: string;
  subId: string;
}

interface Props {
  value: CascadeValue;
  onChange: (next: CascadeValue) => void;
}

/** Cascading Super → Category → Sub category pickers on the shared
 * @duncit/category module (strict, admin-sourced). Keeps the {superId,
 * categoryId, subId} contract so callers stay unchanged. */
export default function CategoryCascade({ value, onChange }: Readonly<Props>) {
  const catValue: AdminCategoryValue = {
    super_id: value.superId,
    super_name: '',
    category_id: value.categoryId,
    category_name: '',
    sub_id: value.subId,
    sub_name: '',
  };
  return (
    <AdminCategorySelect
      value={catValue}
      onChange={(next) =>
        onChange({ superId: next.super_id, categoryId: next.category_id, subId: next.sub_id })
      }
      required
    />
  );
}
