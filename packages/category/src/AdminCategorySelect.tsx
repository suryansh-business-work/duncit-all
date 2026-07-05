import { useMemo } from 'react';
import { Autocomplete, Stack, TextField } from '@mui/material';
import { Fieldset } from './Fieldset';
import { useAdminCategories } from './queries';
import { categoryOptions, subOptions, superOptions, type Option } from './categoryOptions';
import { EMPTY_CATEGORY, type AdminCategoryValue, type CategoryLevel } from './types';

const ALL_LEVELS: CategoryLevel[] = ['super', 'category', 'sub'];
const DEFAULT_LABELS: Record<CategoryLevel, string> = {
  super: 'Super Category',
  category: 'Category',
  sub: 'Sub Category',
};

interface LevelSelectProps {
  label: string;
  options: Option[];
  value: string;
  disabled: boolean;
  required: boolean;
  loading: boolean;
  size: 'small' | 'medium';
  error?: string;
  onPick: (option: Option | null) => void;
}

/** One strict cascading dropdown. Hoisted to module scope (S6478). */
function LevelSelect({
  label,
  options,
  value,
  disabled,
  required,
  loading,
  size,
  error,
  onPick,
}: Readonly<LevelSelectProps>) {
  const selected = options.find((option) => option.value === value) ?? null;
  return (
    <Autocomplete<Option>
      options={options}
      value={selected}
      disabled={disabled}
      loading={loading}
      size={size}
      fullWidth
      getOptionLabel={(option) => option.label}
      isOptionEqualToValue={(a, b) => a.value === b.value}
      onChange={(_, option) => onPick(option)}
      renderInput={(params) => (
        <TextField {...params} label={label} required={required} error={!!error} helperText={error ?? ' '} />
      )}
    />
  );
}

export interface AdminCategorySelectProps {
  value: AdminCategoryValue;
  onChange: (value: AdminCategoryValue) => void;
  /** Which levels to render (default: all three). */
  fields?: CategoryLevel[];
  required?: boolean;
  disabled?: boolean;
  size?: 'small' | 'medium';
  direction?: 'row' | 'column';
  labels?: Partial<Record<CategoryLevel, string>>;
  errors?: Partial<Record<CategoryLevel, string>>;
  /** When set, wrap the fields in a titled <fieldset> with this legend. */
  legend?: string;
  /** Helper hint shown in the fieldset — explain what maps from the category. */
  hint?: string;
}

/**
 * The one common category picker — cascading Super → Category → Sub, sourced
 * strictly from the admin category tree. Emits the full structured value so
 * every form stays in sync with admin.
 */
export function AdminCategorySelect({
  value,
  onChange,
  fields = ALL_LEVELS,
  required = false,
  disabled = false,
  size = 'small',
  direction = 'column',
  labels,
  errors,
  legend,
  hint,
}: Readonly<AdminCategorySelectProps>) {
  const { categories, loading } = useAdminCategories();

  const options = useMemo(
    () => ({
      super: superOptions(categories),
      category: categoryOptions(categories, value.super_id),
      sub: subOptions(categories, value.category_id, value.super_id),
    }),
    [categories, value.super_id, value.category_id],
  );

  const label = (id: string) => categories.find((c) => c.id === id)?.name ?? '';
  const pick: Record<CategoryLevel, (option: Option | null) => void> = {
    super: (option) =>
      onChange({ ...EMPTY_CATEGORY, super_id: option?.value ?? '', super_name: option?.label ?? '' }),
    category: (option) =>
      onChange({
        ...value,
        category_id: option?.value ?? '',
        category_name: option?.label ?? '',
        sub_id: '',
        sub_name: '',
      }),
    sub: (option) => {
      const subId = option?.value ?? '';
      const parentId = categories.find((c) => c.id === subId)?.parent_id ?? value.category_id;
      onChange({
        ...value,
        category_id: parentId || value.category_id,
        category_name: parentId ? label(parentId) : value.category_name,
        sub_id: subId,
        sub_name: option?.label ?? '',
      });
    },
  };

  const selectedValue: Record<CategoryLevel, string> = {
    super: value.super_id,
    category: value.category_id,
    sub: value.sub_id,
  };
  const parentReady: Record<CategoryLevel, boolean> = {
    super: true,
    category: !!value.super_id,
    sub: !!value.super_id,
  };

  const active = ALL_LEVELS.filter((level) => fields.includes(level));
  const rows = (
    <Stack direction={direction} spacing={2} sx={{ width: '100%' }}>
      {active.map((level) => (
        <LevelSelect
          key={level}
          label={labels?.[level] ?? DEFAULT_LABELS[level]}
          options={options[level]}
          value={selectedValue[level]}
          disabled={disabled || !parentReady[level]}
          required={required}
          loading={loading}
          size={size}
          error={errors?.[level]}
          onPick={pick[level]}
        />
      ))}
    </Stack>
  );

  return legend ? (
    <Fieldset legend={legend} hint={hint}>
      {rows}
    </Fieldset>
  ) : (
    rows
  );
}
