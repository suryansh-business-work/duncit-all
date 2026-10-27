import { useMemo } from 'react';
import { Controller, type Control, type FieldValues, type Path } from 'react-hook-form';
import { Autocomplete, TextField } from '@mui/material';
import { useTranslation } from '@duncit/shell';

interface CurrencyFieldProps<T extends FieldValues, TOut> {
  control: Control<T, unknown, TOut>;
  name: Path<T>;
  label: string;
  hint: string;
  /** The ISO 4217 codes the browser knows. Empty: the field takes any typed code. */
  currencies: readonly string[];
}

/** The currency the token prices are in, picked by code with its name beside it. */
export default function CurrencyField<T extends FieldValues, TOut>(props: Readonly<CurrencyFieldProps<T, TOut>>) {
  const { control, name, label, hint, currencies } = props;
  const { locale } = useTranslation();
  const nameOf = useMemo(() => {
    try {
      const names = new Intl.DisplayNames([locale], { type: 'currency' });
      return (code: string) => names.of(code) ?? code;
    } catch {
      return (code: string) => code;
    }
  }, [locale]);

  return (
    <Controller
      control={control}
      name={name}
      render={({ field: { ref, value, onChange, onBlur }, fieldState }) => (
        <Autocomplete<string, false, true, boolean>
          options={currencies}
          freeSolo={currencies.length === 0}
          disableClearable
          fullWidth
          value={typeof value === 'string' ? value : ''}
          onChange={(_event, next) => onChange(next)}
          onInputChange={currencies.length === 0 ? (_event, next) => onChange(next) : undefined}
          onBlur={onBlur}
          renderOption={(optionProps, code) => {
            const { key, ...rest } = optionProps;
            return (
              <li key={key} {...rest}>
                {code} · {nameOf(code)}
              </li>
            );
          }}
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
      )}
    />
  );
}
