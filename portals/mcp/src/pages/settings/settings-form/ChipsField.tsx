import { Controller, type Control, type FieldValues, type Path } from 'react-hook-form';
import { Autocomplete, createFilterOptions, TextField } from '@mui/material';

interface ChipsFieldProps<T extends FieldValues, TOut> {
  control: Control<T, unknown, TOut>;
  name: Path<T>;
  label: string;
  hint: string;
  /** The values that may be picked. Values already saved are always offered too. */
  options?: readonly string[];
  /** How a value reads; defaults to the value itself. */
  labelOf?: (value: string) => string;
  /** Typed values are added as they are, after `normalize` (a host list). */
  freeSolo?: boolean;
  normalize?: (value: string) => string;
}

/** A long option list (2,000 tool names) shows the first matches only — typing narrows it. */
const filterOptions = createFilterOptions<string>({ limit: 100 });
const identity = (value: string) => value;
const NO_OPTIONS: readonly string[] = [];

/**
 * A set of values as chips: pick them from a list, or (freeSolo) type one and
 * press Enter. Duplicates and blanks are dropped as they are added.
 */
export default function ChipsField<T extends FieldValues, TOut>(props: Readonly<ChipsFieldProps<T, TOut>>) {
  const { control, name, label, hint, options = NO_OPTIONS, labelOf = identity, freeSolo = false, normalize = identity } = props;
  return (
    <Controller
      control={control}
      name={name}
      render={({ field: { ref, value, onChange, onBlur }, fieldState }) => {
        const selected: string[] = Array.isArray(value) ? value : [];
        const offered = [...new Set([...options, ...selected])];
        return (
          <Autocomplete<string, true, false, boolean>
            multiple
            freeSolo={freeSolo}
            options={offered}
            value={selected}
            filterOptions={filterOptions}
            getOptionLabel={labelOf}
            filterSelectedOptions
            onBlur={onBlur}
            onChange={(_event, next) => onChange([...new Set(next.map(normalize).filter(Boolean))])}
            renderInput={(params) => (
              <TextField
                {...params}
                inputRef={ref}
                label={label}
                error={Boolean(fieldState.error)}
                helperText={fieldState.error?.message ?? hint}
              />
            )}
          />
        );
      }}
    />
  );
}
