import { Controller, type Control, type FieldValues, type Path } from 'react-hook-form';
import { Autocomplete, createFilterOptions, ListItemText, TextField } from '@mui/material';

/** One store page a link can go to: its group heading, its name and its same-site path. */
export interface LinkOption {
  group: string;
  label: string;
  path: string;
}

interface RhfLinkFieldProps<T extends FieldValues> {
  control: Control<T>;
  /** Holds the link: a store path or a full URL. */
  name: Path<T>;
  label: string;
  options: readonly LinkOption[];
  hint?: string;
  required?: boolean;
}

/** The box shows the stored path; a typed value is kept as typed. */
const pathOf = (option: LinkOption | string) => (typeof option === 'string' ? option : option.path);
/** Typing a name or a path both find the page. */
const filterOptions = createFilterOptions<LinkOption>({ stringify: (option) => `${option.label} ${option.path}` });

/**
 * Where a tile or banner goes: pick one of the store's pages from the list
 * (grouped, name over path), or type any other path or https:// link.
 */
export default function RhfLinkField<T extends FieldValues>({ control, name, label, options, hint, required }: Readonly<RhfLinkFieldProps<T>>) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => {
        const text = typeof field.value === 'string' ? field.value : '';
        return (
          <Autocomplete<LinkOption, false, false, true>
            freeSolo
            size="small"
            options={options}
            groupBy={(option) => option.group}
            filterOptions={filterOptions}
            getOptionLabel={pathOf}
            isOptionEqualToValue={(option, value) => option.path === pathOf(value)}
            value={options.find((option) => option.path === text) ?? (text || null)}
            inputValue={text}
            onInputChange={(_event, next, reason) => {
              if (reason === 'input' || reason === 'clear') field.onChange(next);
            }}
            onChange={(_event, next) => field.onChange(next ? pathOf(next) : '')}
            onBlur={field.onBlur}
            renderOption={({ key, ...props }, option) => (
              <li key={key} {...props}>
                <ListItemText primary={option.label} secondary={option.path} />
              </li>
            )}
            renderInput={(params) => (
              <TextField
                {...params}
                inputRef={field.ref}
                label={label}
                required={required}
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
