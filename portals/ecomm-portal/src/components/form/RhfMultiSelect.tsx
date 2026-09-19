import { Controller, type Control, type FieldValues, type Path } from 'react-hook-form';
import { Autocomplete, TextField } from '@mui/material';
import type { Option } from '../../lib/translate';

interface RhfMultiSelectProps<T extends FieldValues> {
  control: Control<T>;
  /** Holds the chosen values as a string array. */
  name: Path<T>;
  label: string;
  options: readonly Option[];
  hint?: string;
  /** Stable hook for tests on the field's root. */
  testId?: string;
}

const sameOption = (a: Option, b: Option) => a.value === b.value;
const optionLabel = (option: Option) => option.label;

/** Choose any number of options — pet types, categories, facet values — as chips. */
export default function RhfMultiSelect<T extends FieldValues>({
  control,
  name,
  label,
  options,
  hint,
  testId,
}: Readonly<RhfMultiSelectProps<T>>) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => {
        const chosen = new Set<string>(Array.isArray(field.value) ? field.value : []);
        return (
          <Autocomplete
            multiple
            options={options}
            value={options.filter((option) => chosen.has(option.value))}
            getOptionLabel={optionLabel}
            isOptionEqualToValue={sameOption}
            filterSelectedOptions
            onChange={(_event, next) => field.onChange(next.map((option) => option.value))}
            onBlur={field.onBlur}
            data-testid={testId}
            renderInput={(params) => (
              <TextField
                {...params}
                inputRef={field.ref}
                label={label}
                error={Boolean(fieldState.error)}
                helperText={fieldState.error?.message ?? hint ?? ' '}
              />
            )}
          />
        );
      }}
    />
  );
}
