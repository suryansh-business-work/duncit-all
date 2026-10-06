import type { Control, FieldValues, Path } from 'react-hook-form';
import { RhfTextField } from '@duncit/forms';

interface Props<T extends FieldValues> {
  control: Control<T>;
  name: Path<T>;
  label: string;
  hint?: string;
  language: 'html' | 'css' | 'javascript';
  minRows?: number;
}

/** A monospace, non-autocorrected multi-line field for HTML, CSS or JS. */
export default function CodeField<T extends FieldValues>({ control, name, label, hint, language, minRows = 4 }: Readonly<Props<T>>) {
  return (
    <RhfTextField
      control={control}
      name={name}
      label={label}
      hint={hint}
      multiline
      minRows={minRows}
      maxRows={24}
      slotProps={{
        htmlInput: {
          spellCheck: false,
          autoCapitalize: 'off',
          autoCorrect: 'off',
          'data-language': language,
        },
      }}
      sx={{ '& textarea': { fontFamily: 'monospace', fontSize: (theme) => theme.typography.body2.fontSize } }}
    />
  );
}
