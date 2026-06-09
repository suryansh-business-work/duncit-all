import { useField } from 'formik';
import { MenuItem, TextField } from '@mui/material';

interface Props {
  name: string;
  label: string;
  options: string[];
  hint?: string;
  required?: boolean;
  allowEmpty?: boolean;
}

/** Single-select dropdown bound to Formik. */
export default function SelectField({ name, label, options, hint, required, allowEmpty = true }: Readonly<Props>) {
  const [field, meta] = useField(name);
  const showError = Boolean(meta.error && (meta.touched || meta.value !== meta.initialValue));
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
      helperText={showError ? meta.error : (hint ?? ' ')}
    >
      {allowEmpty && (
        <MenuItem value="">
          <em>None</em>
        </MenuItem>
      )}
      {options.map((option) => (
        <MenuItem key={option} value={option}>
          {option}
        </MenuItem>
      ))}
    </TextField>
  );
}
