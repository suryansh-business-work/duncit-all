import { Controller, useFormContext, type FieldValues } from 'react-hook-form';
import { Autocomplete, TextField } from '@mui/material';

interface Props {
  name: string;
  label: string;
  options: readonly string[];
  maxLength: number;
  testId: string;
}

/**
 * A text field that offers HR's configured names (departments, locations) but
 * still takes a new one — HR settings list the usual choices, not the only ones.
 */
export default function SuggestField({ name, label, options, maxLength, testId }: Readonly<Props>) {
  const { control } = useFormContext<FieldValues>();
  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => (
        <Autocomplete<string, false, false, true>
          freeSolo
          options={[...options]}
          value={typeof field.value === 'string' ? field.value : ''}
          inputValue={typeof field.value === 'string' ? field.value : ''}
          onInputChange={(_event, value) => field.onChange(value)}
          onChange={(_event, value) => field.onChange(value ?? '')}
          renderInput={(params) => (
            <TextField
              {...params}
              label={label}
              inputRef={field.ref}
              onBlur={field.onBlur}
              error={!!fieldState.error}
              helperText={fieldState.error?.message ?? ' '}
              slotProps={{ ...params.slotProps, htmlInput: { ...params.slotProps.htmlInput, maxLength, 'data-testid': testId } }}
            />
          )}
        />
      )}
    />
  );
}
