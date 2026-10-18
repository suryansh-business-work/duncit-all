import { Controller, type Control, type FieldValues, type Path } from 'react-hook-form';
import { Autocomplete, Chip, TextField } from '@mui/material';

interface Props<T extends FieldValues> {
  control: Control<T>;
  name: Path<T>;
  label: string;
  options: readonly string[];
  /** Labels the options when they are ids (categories); plain strings show as they are. */
  optionLabel?: (option: string) => string;
  hint?: string;
  disabled?: boolean;
  testId?: string;
}

/** A react-hook-form string[] picked from a fixed list, shown as chips. */
export default function ChipMultiSelect<T extends FieldValues>({
  control,
  name,
  label,
  options,
  optionLabel = (option) => option,
  hint,
  disabled,
  testId,
}: Readonly<Props<T>>) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field: { ref, value, onChange, onBlur }, fieldState }) => (
        <Autocomplete
          multiple
          disabled={disabled}
          options={[...options]}
          value={(value as string[] | undefined) ?? []}
          onChange={(_event, next) => onChange(next)}
          onBlur={onBlur}
          getOptionLabel={optionLabel}
          filterSelectedOptions
          data-testid={testId}
          renderValue={(selected, getItemProps) =>
            selected.map((option, index) => {
              const { key, ...itemProps } = getItemProps({ index });
              return <Chip key={key} size="small" label={optionLabel(option)} {...itemProps} />;
            })
          }
          renderInput={(params) => (
            <TextField
              {...params}
              inputRef={ref}
              label={label}
              error={!!fieldState.error}
              helperText={fieldState.error?.message ?? hint ?? ' '}
            />
          )}
        />
      )}
    />
  );
}
