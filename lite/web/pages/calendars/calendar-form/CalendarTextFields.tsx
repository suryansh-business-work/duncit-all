import { useId } from 'react';
import { Controller, useFormContext } from 'react-hook-form';
import { InputBase, Stack, Typography } from '@mui/material';
import { useWebT } from '../../../../shared/i18n';
import type { CalendarValues } from './calendar.types';

const LINE = { borderBottom: 1, borderColor: 'divider', transition: 'border-color 150ms', '&.Mui-focused': { borderColor: 'primary.main' } } as const;

/** The calendar's name as a large line and its description under it, both read the way the page will show them. */
export function CalendarTextFields() {
  const { t } = useWebT();
  const nameErrorId = useId();
  const { control } = useFormContext<CalendarValues>();
  return (
    <Stack spacing={1}>
      <Controller
        control={control}
        name="name"
        render={({ field: { ref, ...field }, fieldState }) => (
          <Stack spacing={0.5}>
            <InputBase
              {...field}
              inputRef={ref}
              placeholder={t('liteWeb.calendars.namePlaceholder')}
              fullWidth
              inputProps={{ maxLength: 80, 'aria-label': t('liteWeb.calendars.name'), 'aria-invalid': Boolean(fieldState.error), 'aria-describedby': fieldState.error ? nameErrorId : undefined, 'data-testid': 'calendar-name' }}
              sx={{ ...LINE, fontSize: { xs: '1.5rem', sm: '1.75rem' }, fontWeight: 700, py: 0.5, borderColor: fieldState.error ? 'error.main' : 'divider' }}
            />
            {fieldState.error ? (
              <Typography id={nameErrorId} role="alert" variant="body2" color="error" sx={{ fontWeight: 700 }}>
                {fieldState.error.message}
              </Typography>
            ) : null}
          </Stack>
        )}
      />
      <Controller
        control={control}
        name="description"
        render={({ field: { ref, ...field }, fieldState }) => (
          <Stack spacing={0.5}>
            <InputBase
              {...field}
              inputRef={ref}
              placeholder={t('liteWeb.calendars.descriptionPlaceholder')}
              multiline
              minRows={1}
              fullWidth
              inputProps={{ maxLength: 1000, 'aria-label': t('liteWeb.calendars.description'), 'data-testid': 'calendar-description' }}
              sx={{ color: 'text.secondary', py: 0.5 }}
            />
            {fieldState.error ? (
              <Typography role="alert" variant="body2" color="error">
                {fieldState.error.message}
              </Typography>
            ) : null}
          </Stack>
        )}
      />
    </Stack>
  );
}
