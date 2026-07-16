/** Stand-in for @duncit/category used by vi.mock in the club-form tests. It
 * renders a tiny picker that pushes a fixed cascade value through onChange and
 * echoes the legend + forwarded errors so tests can assert them. */
export const EMPTY_CATEGORY = {
  super_id: '',
  super_name: '',
  category_id: '',
  category_name: '',
  sub_id: '',
  sub_name: '',
};

export const useAdminCategories = () => ({ categories: [{ super_id: 'S1' }] });

export const buildCategoryValue = (_categories: unknown, superId: string, subId: string) => ({
  ...EMPTY_CATEGORY,
  super_id: superId,
  sub_id: subId,
});

interface CategorySelectProps {
  value: { super_id: string; sub_id: string };
  onChange: (next: Record<string, string>) => void;
  legend: string;
  errors?: { super?: string; sub?: string };
}

export function AdminCategorySelect({ value, onChange, legend, errors }: Readonly<CategorySelectProps>) {
  return (
    <div>
      <span data-testid="cat-legend">{legend}</span>
      <span data-testid="cat-value">{value.super_id}:{value.sub_id}</span>
      <span data-testid="cat-super-err">{errors?.super}</span>
      <span data-testid="cat-sub-err">{errors?.sub}</span>
      <button
        type="button"
        onClick={() => onChange({ super_id: 'S9', super_name: '', category_id: 'C9', category_name: '', sub_id: 'SUB9', sub_name: '' })}
      >
        pick-category
      </button>
    </div>
  );
}
