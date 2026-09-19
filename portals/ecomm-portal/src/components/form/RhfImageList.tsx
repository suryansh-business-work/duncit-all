import { Controller, type Control, type FieldValues, type Path } from 'react-hook-form';
import { FormHelperText, Stack } from '@mui/material';
import { MediaListField } from '@duncit/media-picker';
import { STORE_MEDIA_FOLDER } from './RhfImageField';

interface RhfImageListProps<T extends FieldValues> {
  control: Control<T>;
  /** Holds the image URLs in order, as a string array. */
  name: Path<T>;
  label: string;
  hint?: string;
  /** The add button's words; the picker's own "Add image" when omitted. */
  addLabel?: string;
  /** Stable hook for tests on the list. */
  testId?: string;
}

/** The picker speaks newline-separated URLs; the form keeps an array. Commas are legal in an ImageKit URL, so only newlines split. */
const toLines = (value: unknown): string => (Array.isArray(value) ? value.join('\n') : '');
const fromLines = (text: string): string[] =>
  text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

/** An ordered list of pictures: add (upload or pick), replace, move and remove, bound to the form. */
export default function RhfImageList<T extends FieldValues>({
  control,
  name,
  label,
  hint,
  addLabel,
  testId,
}: Readonly<RhfImageListProps<T>>) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => (
        <Stack spacing={0.5} data-testid={testId}>
          <MediaListField
            label={label}
            value={toLines(field.value)}
            onChange={(next) => field.onChange(fromLines(next))}
            folder={STORE_MEDIA_FOLDER}
            helperText={hint}
            buttonLabel={addLabel}
          />
          {fieldState.error && <FormHelperText error>{fieldState.error.message}</FormHelperText>}
        </Stack>
      )}
    />
  );
}
