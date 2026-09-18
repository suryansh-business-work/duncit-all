import { Controller, type Control, type FieldValues, type Path } from 'react-hook-form';
import { SingleImageUploadField } from '@duncit/media-picker';

interface RhfImageFieldProps<T extends FieldValues> {
  control: Control<T>;
  /** Holds the image URL. */
  name: Path<T>;
  label: string;
  hint?: string;
}

/** The ImageKit folder every picture this console uploads lands in. */
export const STORE_MEDIA_FOLDER = '/pet-store';

/** An image URL: paste one, or upload a file and the field fills itself. */
export default function RhfImageField<T extends FieldValues>({ control, name, label, hint }: Readonly<RhfImageFieldProps<T>>) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => (
        <SingleImageUploadField
          label={label}
          value={field.value ?? ''}
          onChange={field.onChange}
          folder={STORE_MEDIA_FOLDER}
          error={Boolean(fieldState.error)}
          helperText={fieldState.error?.message ?? hint ?? ' '}
        />
      )}
    />
  );
}
