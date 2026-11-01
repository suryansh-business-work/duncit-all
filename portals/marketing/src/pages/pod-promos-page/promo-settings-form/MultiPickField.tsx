import { Controller, type Control, type FieldPathByValue, type FieldValues } from 'react-hook-form';
import { Autocomplete, TextField } from '@mui/material';
import type { PickOption } from '../queries';

interface Props<T extends FieldValues> {
  control: Control<T>;
  /** A field of the form that holds a list of ids. */
  name: FieldPathByValue<T, string[]>;
  label: string;
  hint: string;
  options: readonly PickOption[];
  disabled: boolean;
  testId: string;
}

/** The field's ids as strings, whatever the form library hands back. */
const idsOf = (value: unknown): string[] => (Array.isArray(value) ? value.filter((id): id is string => typeof id === 'string') : []);

/**
 * A multi-choice picker over ids, shown by name. An id the options no longer
 * hold (a club since deleted) is kept and shown by its id, so saving the form
 * never silently drops a filter someone set. Used by the settings and the
 * schedule forms alike.
 */
export default function MultiPickField<T extends FieldValues>({ control, name, label, hint, options, disabled, testId }: Readonly<Props<T>>) {
  const byId = new Map(options.map((option) => [option.id, option]));
  return (
    <Controller
      control={control}
      name={name}
      render={({ field: { ref, value, onChange, onBlur }, fieldState }) => (
        <Autocomplete<PickOption, true>
          multiple
          disabled={disabled}
          options={[...options]}
          value={idsOf(value).map((id) => byId.get(id) ?? { id, label: id })}
          getOptionLabel={(option) => option.label}
          isOptionEqualToValue={(option, chosen) => option.id === chosen.id}
          onChange={(_event, chosen) => onChange(chosen.map((option) => option.id))}
          onBlur={onBlur}
          data-testid={testId}
          renderInput={(params) => (
            <TextField
              {...params}
              inputRef={ref}
              label={label}
              error={!!fieldState.error}
              helperText={fieldState.error?.message ?? hint}
            />
          )}
        />
      )}
    />
  );
}
