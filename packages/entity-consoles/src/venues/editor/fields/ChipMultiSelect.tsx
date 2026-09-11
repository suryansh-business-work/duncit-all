import { Autocomplete, Chip, TextField } from '@mui/material';
import { Controller, type Control, type FieldValues, type Path } from 'react-hook-form';

/**
 * A list of strings, chosen from a catalogue the SERVER serves.
 *
 * Amenities, facilities, security measures and tags are all "pick several", and
 * only tags may invent a value — so `freeSolo` is the one difference between
 * the four rather than four components (rule 34). The options always come from
 * `venueRegistrationConfig`, never from a list typed into a client (rule 2).
 */
export interface ChipMultiSelectProps<T extends FieldValues> {
  control: Control<T>;
  name: Path<T>;
  label: string;
  options: readonly string[];
  hint?: string;
  /** Tags only: the admin may add a value that is not in the catalogue. */
  freeSolo?: boolean;
  disabled?: boolean;
}

export default function ChipMultiSelect<T extends FieldValues>({
  control,
  name,
  label,
  options,
  hint,
  freeSolo = false,
  disabled = false,
}: Readonly<ChipMultiSelectProps<T>>) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => (
        <Autocomplete
          multiple
          freeSolo={freeSolo}
          disableCloseOnSelect
          disabled={disabled}
          options={[...options]}
          value={(field.value as string[]) ?? []}
          onChange={(_event, next) => field.onChange(next)}
          renderValue={(picked, getItemProps) =>
            picked.map((option, index) => {
              const { key: _key, ...tagProps } = getItemProps({ index });
              return <Chip key={option} {...tagProps} size="small" label={option} />;
            })
          }
          renderInput={(params) => (
            <TextField
              {...params}
              label={label}
              size="small"
              error={!!fieldState.error}
              helperText={fieldState.error?.message ?? hint ?? ' '}
            />
          )}
        />
      )}
    />
  );
}
