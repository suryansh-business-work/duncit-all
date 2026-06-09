import { useField } from 'formik';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';

interface Props {
  name: string;
  label: string;
  hint?: string;
}

/** MUIX date picker bound to Formik (value is Date | null). */
export default function DateField({ name, label, hint }: Readonly<Props>) {
  const [field, meta, helpers] = useField<Date | null>(name);
  const showError = Boolean(meta.error && meta.touched);
  return (
    <DatePicker
      label={label}
      value={field.value ?? null}
      onChange={(value) => helpers.setValue(value)}
      slotProps={{
        textField: {
          size: 'small',
          fullWidth: true,
          onBlur: () => helpers.setTouched(true),
          error: showError,
          helperText: showError ? meta.error : (hint ?? ' '),
        },
      }}
    />
  );
}
