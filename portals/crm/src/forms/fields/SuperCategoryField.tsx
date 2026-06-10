import { useField } from 'formik';
import { MenuItem, Skeleton, TextField } from '@mui/material';
import { useSuperCategories } from '../../api/useSuperCategories';

interface Props {
  name: string;
  label?: string;
  hint?: string;
  required?: boolean;
}

/**
 * Single-select dropdown bound to Formik, sourced from the admin-managed
 * SUPER category list (`categories(filter: { level: SUPER })`). Empty value
 * means "no super category picked yet".
 */
export default function SuperCategoryField({
  name,
  label = 'Super Category',
  hint,
  required,
}: Readonly<Props>) {
  const [field, meta] = useField<string>(name);
  const { options, loading } = useSuperCategories();
  const showError = Boolean(meta.error && (meta.touched || meta.value !== meta.initialValue));

  if (loading && options.length === 0) {
    return <Skeleton variant="rounded" height={40} />;
  }

  return (
    <TextField
      select
      fullWidth
      size="small"
      label={label}
      required={required}
      {...field}
      value={field.value ?? ''}
      error={showError}
      helperText={
        showError
          ? meta.error
          : hint ?? (options.length === 0 ? 'No super categories yet — ask admin to create one.' : ' ')
      }
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
  );
}
