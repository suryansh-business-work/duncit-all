import { Controller, type Control, type FieldValues, type Path } from 'react-hook-form';
import { Chip, MenuItem, Stack, TextField } from '@mui/material';

export interface SelectOption {
  value: string;
  label: string;
}

interface Props<T extends FieldValues> {
  control: Control<T>;
  name: Path<T>;
  label: string;
  hint?: string;
  options: ReadonlyArray<SelectOption>;
  /** Renders a multi-select whose value is a string array. */
  multiple?: boolean;
}

/** renderValue for the multiple variant — hoisted so the chip row is not re-defined per render (S6478). */
const renderSelectedChips =
  (options: ReadonlyArray<SelectOption>) => (selected: unknown) => (
    <Stack direction="row" sx={{ gap: 0.5, flexWrap: 'wrap' }}>
      {(selected as string[]).map((value) => (
        <Chip key={value} size="small" label={options.find((o) => o.value === value)?.label ?? value} />
      ))}
    </Stack>
  );

/**
 * A select over options the SERVER supplied.
 *
 * Every list in the rule editor comes from `rateLimitOptions`, so this cannot
 * be a typed `z.enum` component — the whole point is that a value added on the
 * server shows up here without a portal release.
 */
export default function EnumSelect<T extends FieldValues>({
  control,
  name,
  label,
  hint,
  options,
  multiple,
}: Readonly<Props<T>>) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => (
        <TextField
          select
          fullWidth
          label={label}
          value={field.value ?? (multiple ? [] : '')}
          onChange={field.onChange}
          onBlur={field.onBlur}
          inputRef={field.ref}
          error={!!fieldState.error}
          helperText={fieldState.error?.message ?? hint ?? ' '}
          slotProps={{
            select: {
              multiple,
              renderValue: multiple ? renderSelectedChips(options) : undefined,
            },
          }}
        >
          {options.map((option) => (
            <MenuItem key={option.value} value={option.value}>
              {option.label}
            </MenuItem>
          ))}
        </TextField>
      )}
    />
  );
}
