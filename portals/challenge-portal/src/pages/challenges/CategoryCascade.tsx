import { useQuery } from '@apollo/client';
import { MenuItem, Stack, TextField } from '@mui/material';
import { CATEGORY_OPTIONS, type CategoryOption } from '../../graphql/challenges';

export interface CascadeValue {
  superId: string;
  categoryId: string;
  subId: string;
}

interface Props {
  value: CascadeValue;
  onChange: (next: CascadeValue) => void;
}

interface LevelSelectProps {
  label: string;
  value: string;
  options: CategoryOption[];
  disabled?: boolean;
  helper?: string;
  onChange: (id: string) => void;
}

function LevelSelect({ label, value, options, disabled, helper, onChange }: Readonly<LevelSelectProps>) {
  return (
    <TextField
      select
      size="small"
      label={label}
      value={value}
      disabled={disabled}
      helperText={helper}
      onChange={(e) => onChange(e.target.value)}
      fullWidth
    >
      <MenuItem value="">
        <em>None</em>
      </MenuItem>
      {options.map((opt) => (
        <MenuItem key={opt.id} value={opt.id}>
          {opt.name}
        </MenuItem>
      ))}
    </TextField>
  );
}

/** Cascading Super → Category → Sub category pickers, sourced from the shared
 * Category hierarchy. Selecting a parent resets its descendants. */
export default function CategoryCascade({ value, onChange }: Readonly<Props>) {
  const supers = useQuery(CATEGORY_OPTIONS, { variables: { filter: { level: 'SUPER' } } });
  const cats = useQuery(CATEGORY_OPTIONS, {
    variables: { filter: { level: 'CATEGORY', parent_id: value.superId } },
    skip: !value.superId,
  });
  const subs = useQuery(CATEGORY_OPTIONS, {
    variables: { filter: { level: 'SUB', parent_id: value.categoryId } },
    skip: !value.categoryId,
  });

  const superOptions: CategoryOption[] = supers.data?.categories ?? [];
  const categoryOptions: CategoryOption[] = cats.data?.categories ?? [];
  const subOptions: CategoryOption[] = subs.data?.categories ?? [];

  return (
    <Stack spacing={2}>
      <LevelSelect
        label="Super category"
        value={value.superId}
        options={superOptions}
        onChange={(superId) => onChange({ superId, categoryId: '', subId: '' })}
      />
      <LevelSelect
        label="Category"
        value={value.categoryId}
        options={categoryOptions}
        disabled={!value.superId}
        helper={value.superId ? undefined : 'Pick a super category first'}
        onChange={(categoryId) => onChange({ ...value, categoryId, subId: '' })}
      />
      <LevelSelect
        label="Sub-category"
        value={value.subId}
        options={subOptions}
        disabled={!value.categoryId}
        helper={value.categoryId ? 'Optional' : 'Pick a category first'}
        onChange={(subId) => onChange({ ...value, subId })}
      />
    </Stack>
  );
}
