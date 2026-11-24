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
  /** When set, a first option with this label that selects every option at once. */
  allLabel?: string;
}

type Item = string | { id: string; name: string };
const idOf = (item: Item) => (typeof item === 'string' ? item : item.id);
/** Not a value any source can have (channel ids and collection names never start with a colon). */
export const ALL_OPTION = ':all';

/** A multi-select of values picked from a live source, as chips; validation messages from the form's schema. */
export default function TagsField<T extends FieldValues>({ control, name, label, hint, options, loading, freeSolo, asObjects, allLabel }: Readonly<Props<T>>) {
  const labelOf = (id: string) => (id === ALL_OPTION ? (allLabel ?? id) : (options.find((o) => o.value === id)?.label ?? id));
  const values = options.map((o) => o.value);
  const offerAll = Boolean(allLabel) && values.length > 0;
  return (
    <Controller
      control={control as Control<T>}
      name={name}
      render={({ field, fieldState }) => {
        const selected = ((field.value as Item[] | undefined) ?? []).map(idOf);
        const allSelected = offerAll && values.every((v) => selected.includes(v));
        const errorText = fieldState.error?.message ?? (Array.isArray(fieldState.error) ? fieldState.error.find(Boolean)?.message : undefined);
        const commit = (ids: string[]) => field.onChange(asObjects ? ids.map((id) => ({ id, name: labelOf(id) })) : ids);
        return (
          <Autocomplete
            multiple
            disableCloseOnSelect
            freeSolo={freeSolo}
            loading={loading}
            options={offerAll && !allSelected ? [ALL_OPTION, ...values] : values}
            value={selected}
            getOptionLabel={labelOf}
            onChange={(_, next) => commit(next.includes(ALL_OPTION) ? [...new Set([...next.filter((id) => id !== ALL_OPTION), ...values])] : next)}
            onBlur={field.onBlur}
            renderValue={(ids, getItemProps) => ids.map((id, index) => <Chip size="small" label={labelOf(id)} {...getItemProps({ index })} key={id} />)}
            renderInput={(params) => <TextField {...params} label={label} error={Boolean(errorText)} helperText={errorText ?? hint} />}
          />
        );
      }}
    />
  );
}
