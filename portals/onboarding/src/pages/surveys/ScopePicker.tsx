import { AdminCategorySelect, EMPTY_CATEGORY, type AdminCategoryValue } from '@duncit/category';

export interface Scope {
  super_category_id: string;
  category_id: string;
  sub_category_id: string;
}

export const emptyScope: Scope = { super_category_id: '', category_id: '', sub_category_id: '' };

interface Props {
  value: Scope;
  onChange: (next: Scope) => void;
  disabled?: boolean;
  /** When set, wrap the fields in a titled <fieldset> with this legend + hint. */
  legend?: string;
  hint?: string;
}

/**
 * Cascading Super → Category → Sub picker for scoping/filtering surveys.
 * Adapts the survey `Scope` shape to the one common `@duncit/category` picker so
 * the taxonomy stays sourced strictly from the admin category tree.
 */
export default function ScopePicker({ value, onChange, disabled, legend, hint }: Readonly<Props>) {
  const catValue: AdminCategoryValue = {
    ...EMPTY_CATEGORY,
    super_id: value.super_category_id,
    category_id: value.category_id,
    sub_id: value.sub_category_id,
  };
  const handleChange = (next: AdminCategoryValue) =>
    onChange({
      super_category_id: next.super_id,
      category_id: next.category_id,
      sub_category_id: next.sub_id,
    });

  return (
    <AdminCategorySelect
      value={catValue}
      onChange={handleChange}
      direction="row"
      disabled={disabled}
      legend={legend}
      hint={hint}
    />
  );
}
