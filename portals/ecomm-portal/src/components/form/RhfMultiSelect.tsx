import { Controller, type Control, type FieldValues, type Path } from 'react-hook-form';
import { Autocomplete, createFilterOptions, TextField, type FilterOptionsState } from '@mui/material';
import { useTranslation } from '@duncit/shell';
import type { Option } from '../../lib/translate';

interface RhfMultiSelectProps<T extends FieldValues> {
  control: Control<T>;
  /** Holds the chosen values as a string array. */
  name: Path<T>;
  label: string;
  options: readonly Option[];
  hint?: string;
  /** Let a value that matches no option be typed and chosen too — it is sent as typed. */
  freeSolo?: boolean;
  /** Stable hook for tests on the field's root. */
  testId?: string;
}

const optionLabel = (option: Option | string) => (typeof option === 'string' ? option : option.label);
const valueOf = (item: Option | string) => (typeof item === 'string' ? item : item.value);
/** A typed value stands for the option with that value. */
const sameOption = (option: Option, value: Option | string) => option.value === valueOf(value);
const filterByLabel = createFilterOptions<Option>();

/** Choose any number of options — pet types, categories, facet values — as chips. */
export default function RhfMultiSelect<T extends FieldValues>({
  control,
  name,
  label,
  options,
  hint,
  freeSolo = false,
  testId,
}: Readonly<RhfMultiSelectProps<T>>) {
  const { t } = useTranslation();
  const byValue = new Map(options.map((option) => [option.value, option]));
  /** A chosen value the options do not know (one typed in) still shows as a chip. */
  const toChip = (value: string): Option => byValue.get(value) ?? { value, label: value };
  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => {
        const chosen: string[] = Array.isArray(field.value) ? field.value : [];
        /** The matching options, plus an "Add" row for a typed value nothing knows yet. */
        const filterOptions = (candidates: Option[], state: FilterOptionsState<Option>) => {
          const filtered = filterByLabel(candidates, state);
          const typed = state.inputValue.trim();
          const known = typed === '' || chosen.includes(typed) || candidates.some((option) => option.label === typed || option.value === typed);
          if (freeSolo && !known) {
            filtered.push({ value: typed, label: t('ecommPortal.productEditor.facetAdd', { vars: { value: typed } }) });
          }
          return filtered;
        };
        return (
          <Autocomplete
            multiple
            freeSolo={freeSolo}
            options={options}
            value={chosen.map(toChip)}
            getOptionLabel={optionLabel}
            isOptionEqualToValue={sameOption}
            filterSelectedOptions
            filterOptions={filterOptions}
            onChange={(_event, next) => field.onChange([...new Set(next.map(valueOf))])}
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
