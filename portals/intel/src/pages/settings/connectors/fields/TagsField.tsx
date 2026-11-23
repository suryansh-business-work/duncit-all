import { Controller, type Control, type FieldValues, type Path } from 'react-hook-form';
import { Autocomplete, Chip, TextField } from '@mui/material';

interface Props<T extends FieldValues> {
  control: Control<T, unknown, unknown>;
  name: Path<T>;
  label: string;
  hint: string;
  /** Suggestions loaded from the source (collections, channels…). */
  options: Array<{ value: string; label: string }>;
  loading?: boolean;
  /** Allow typing values that are not in `options` (when the picker could not load). */
  freeSolo?: boolean;
  /** Store `{ id, name }` objects instead of plain strings (Slack channels). */
  asObjects?: boolean;
}

type Item = string | { id: string; name: string };
const idOf = (item: Item) => (typeof item === 'string' ? item : item.id);

/** A multi-select of values picked from a live source, as chips; validation messages from the form's schema. */
export default function TagsField<T extends FieldValues>({ control, name, label, hint, options, loading, freeSolo, asObjects }: Readonly<Props<T>>) {
  const labelOf = (id: string) => options.find((o) => o.value === id)?.label ?? id;
  return (
    <Controller
      control={control as Control<T>}
      name={name}
      render={({ field, fieldState }) => {
        const selected = ((field.value as Item[] | undefined) ?? []).map(idOf);
        const errorText = fieldState.error?.message ?? (Array.isArray(fieldState.error) ? fieldState.error.find(Boolean)?.message : undefined);
        return (
          <Autocomplete
            multiple
            freeSolo={freeSolo}
            loading={loading}
            options={options.map((o) => o.value)}
            value={selected}
            getOptionLabel={labelOf}
            onChange={(_, next) => field.onChange(asObjects ? next.map((id) => ({ id, name: labelOf(id) })) : next)}
            onBlur={field.onBlur}
            renderValue={(values, getItemProps) => values.map((id, index) => <Chip size="small" label={labelOf(id)} {...getItemProps({ index })} key={id} />)}
            renderInput={(params) => <TextField {...params} label={label} error={Boolean(errorText)} helperText={errorText ?? hint} />}
          />
        );
      }}
    />
  );
}
