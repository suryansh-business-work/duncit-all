import { useWatch, type Control, type FieldValues, type Path } from 'react-hook-form';
import { RhfTextField } from '@duncit/forms';
import { useTranslation } from '@duncit/shell';

interface RhfCountedFieldProps<T extends FieldValues> {
  control: Control<T>;
  name: Path<T>;
  label: string;
  /** The length a search result shows before cutting the text off. */
  max: number;
  multiline?: boolean;
}

/** A text field that counts its characters against the length a search result shows. */
export default function RhfCountedField<T extends FieldValues>({
  control,
  name,
  label,
  max,
  multiline,
}: Readonly<RhfCountedFieldProps<T>>) {
  const { t } = useTranslation();
  const value: unknown = useWatch({ control, name });
  const count = typeof value === 'string' ? value.length : 0;
  return (
    <RhfTextField
      control={control}
      name={name}
      label={label}
      multiline={multiline}
      minRows={multiline ? 2 : undefined}
      hint={t('ecommPortal.form.counter', { vars: { count, max } })}
    />
  );
}
