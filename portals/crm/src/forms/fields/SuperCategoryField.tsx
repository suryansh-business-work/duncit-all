import { Controller, useFormContext } from 'react-hook-form';
import { MenuItem, Skeleton, TextField } from '@mui/material';
import { useSuperCategories } from '../../api/useSuperCategories';

interface Props {
  name: string;
  label?: string;
  hint?: string;
  required?: boolean;
}

/**
 * Single-select dropdown bound to react-hook-form, sourced from the
 * admin-managed SUPER category list (`categories(filter: { level: SUPER })`).
 * Empty value means "no super category picked yet".
 */
export default function SuperCategoryField({
  name,
  label = 'Super Category',
  hint,
  required,
}: Readonly<Props>) {
  const { control } = useFormContext();
  const { options, loading } = useSuperCategories();

  if (loading && options.length === 0) {
    return <Skeleton variant="rounded" height={40} />;
  }

  const fallbackHint = hint ?? (options.length === 0 ? 'No super categories yet — ask admin to create one.' : ' ');

  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => (
        <TextField
          select
          fullWidth
          size="small"
          label={label}
          required={required}
          {...field}
          value={field.value ?? ''}
          error={!!fieldState.error}
          helperText={fieldState.error?.message ?? fallbackHint}
        >
          <MenuItem value="">
            <em>None</em>
          </MenuItem>
          {options.map((c) => (
            <MenuItem key={c.id} value={c.id}>
              {c.name}
            </MenuItem>
          ))}
        </TextField>
      )}
    />
  );
}
