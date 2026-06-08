import { useQuery } from '@apollo/client';
import { MenuItem, Stack, TextField } from '@mui/material';
import { CATEGORIES, type CategoryLevel, type CategoryOption } from './queries';

export interface Scope {
  super_category_id: string;
  category_id: string;
  sub_category_id: string;
}

interface Props {
  value: Scope;
  onChange: (next: Scope) => void;
  /** Empty option label shown at each level (e.g. "All" for filters, "— Kind default —" for the builder). */
  emptyLabel?: string;
  disabled?: boolean;
}

const useLevel = (level: CategoryLevel, parentId: string) => {
  const skip = level !== 'SUPER' && !parentId;
  const { data, loading } = useQuery<{ categories: CategoryOption[] }>(CATEGORIES, {
    variables: { level, parent_id: level === 'SUPER' ? null : parentId },
    skip,
    fetchPolicy: 'cache-and-network',
  });
  const options = (data?.categories ?? [])
    .filter((c) => c.is_active !== false)
    .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0) || a.name.localeCompare(b.name));
  return { options, loading };
};

/**
 * Cascading Super → Category → Sub single-select picker. Selecting a narrower
 * level clears stale deeper picks. Shared by the survey list filter and builder.
 */
export default function ScopePicker({ value, onChange, emptyLabel = 'All', disabled }: Props) {
  const supers = useLevel('SUPER', '');
  const cats = useLevel('CATEGORY', value.super_category_id);
  const subs = useLevel('SUB', value.category_id);

  const select = (level: keyof Scope, id: string) => {
    if (level === 'super_category_id') onChange({ super_category_id: id, category_id: '', sub_category_id: '' });
    else if (level === 'category_id') onChange({ ...value, category_id: id, sub_category_id: '' });
    else onChange({ ...value, sub_category_id: id });
  };

  return (
    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ flex: 1 }}>
      <TextField
        select size="small" label="Super category" value={value.super_category_id} disabled={disabled}
        onChange={(e) => select('super_category_id', e.target.value)} sx={{ minWidth: 180, flex: 1 }}
      >
        <MenuItem value="">{emptyLabel}</MenuItem>
        {supers.options.map((c) => <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>)}
      </TextField>
      <TextField
        select size="small" label="Category" value={value.category_id}
        disabled={disabled || !value.super_category_id}
        onChange={(e) => select('category_id', e.target.value)} sx={{ minWidth: 180, flex: 1 }}
      >
        <MenuItem value="">{emptyLabel}</MenuItem>
        {cats.options.map((c) => <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>)}
      </TextField>
      <TextField
        select size="small" label="Sub category" value={value.sub_category_id}
        disabled={disabled || !value.category_id}
        onChange={(e) => select('sub_category_id', e.target.value)} sx={{ minWidth: 180, flex: 1 }}
      >
        <MenuItem value="">{emptyLabel}</MenuItem>
        {subs.options.map((c) => <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>)}
      </TextField>
    </Stack>
  );
}
