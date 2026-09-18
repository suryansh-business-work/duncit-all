import { useId } from 'react';
import { Controller, type Control, type FieldValues, type Path } from 'react-hook-form';
import { FormLabel, Stack } from '@mui/material';
import { DuncitRichTextInput } from '@duncit/rich-text';
import { STORE_MEDIA_FOLDER } from './RhfImageField';

interface RhfRichTextProps<T extends FieldValues> {
  control: Control<T>;
  /** Holds HTML. */
  name: Path<T>;
  label: string;
  /** What the AI rewrite is improving, e.g. "pet store returns policy". */
  aiContext: string;
}

/** A labelled rich-text (HTML) field bound to the form. */
export default function RhfRichText<T extends FieldValues>({ control, name, label, aiContext }: Readonly<RhfRichTextProps<T>>) {
  const labelId = useId();
  return (
    <Controller
      control={control}
      name={name}
      render={({ field }) => (
        <Stack spacing={0.75} role="group" aria-labelledby={labelId}>
          <FormLabel id={labelId}>{label}</FormLabel>
          <DuncitRichTextInput
            value={field.value ?? ''}
            onChange={(html) => field.onChange(html)}
            ariaLabel={label}
            aiContext={aiContext}
            imageFolder={STORE_MEDIA_FOLDER}
            minHeight={140}
          />
        </Stack>
      )}
    />
  );
}
