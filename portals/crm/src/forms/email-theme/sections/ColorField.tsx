import type { ChangeEvent } from 'react';
import { Controller, useFormContext } from 'react-hook-form';
import { Box, Stack, TextField } from '@mui/material';
import { HEX_COLOR } from '@duncit/regex';

interface Props {
  name: string;
  label: string;
  hint?: string;
}

/** `#abc` → `#aabbcc`, because the native colour picker only accepts six digits. */
const sixDigit = (value: string): string => {
  if (!HEX_COLOR.test(value)) return '#000000';
  return value.length === 4 ? `#${[...value.slice(1)].map((c) => c + c).join('')}` : value;
};

/** A colour as a native swatch picker beside its hex code; either can be edited. */
export default function ColorField({ name, label, hint }: Readonly<Props>) {
  const { control } = useFormContext();
  return (
    <Controller
      name={name}
      control={control}
      render={({ field, fieldState }) => (
        <Stack direction="row" spacing={1} sx={{ alignItems: 'flex-start' }}>
          <Box
            component="input"
            type="color"
            aria-label={label}
            value={sixDigit(String(field.value ?? ''))}
            onChange={(e: ChangeEvent<HTMLInputElement>) => field.onChange(e.target.value)}
            sx={(theme) => ({
              width: 40,
              height: 40,
              p: 0.25,
              flexShrink: 0,
              cursor: 'pointer',
              border: `1px solid ${theme.palette.divider}`,
              borderRadius: 1,
              bgcolor: 'background.paper',
            })}
          />
          <TextField
            {...field}
            value={field.value ?? ''}
            size="small"
            label={label}
            fullWidth
            error={!!fieldState.error}
            helperText={fieldState.error?.message ?? hint ?? ' '}
            slotProps={{ htmlInput: { spellCheck: false, 'data-testid': `theme-${name}` } }}
          />
        </Stack>
      )}
    />
  );
}
