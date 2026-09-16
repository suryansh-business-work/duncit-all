import { Controller, useWatch, type Control } from 'react-hook-form';
import {
  Box,
  FormControl,
  FormControlLabel,
  FormLabel,
  Radio,
  RadioGroup,
  Stack,
  Switch,
} from '@mui/material';
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker';
import { useTranslation } from '@duncit/app-settings';
import { expiryOptions, type StatusFormValues } from './status.types';

interface Props {
  control: Control<StatusFormValues>;
}

/**
 * How long the status rides in the rail, and whether it rides at all.
 *
 * The three choices are the server's: 24 hours from the save, never, or a date
 * the marketer picks. Nothing is scheduled — the read filters on `expires_at`,
 * so an expired status stays in this table and can be switched back on.
 */
export default function StatusExpiryFields({ control }: Readonly<Props>) {
  const { t } = useTranslation();
  const expiry = useWatch({ control, name: 'expiry' });

  return (
    <Stack spacing={2}>
      <Controller
        control={control}
        name="expiry"
        render={({ field }) => (
          <FormControl>
            <FormLabel id="status-expiry-label">{t('marketing.status.expiry')}</FormLabel>
            <RadioGroup
              row
              aria-labelledby="status-expiry-label"
              value={field.value}
              onChange={field.onChange}
            >
              {expiryOptions(t).map((option) => (
                <FormControlLabel
                  key={option.value}
                  value={option.value}
                  label={option.label}
                  control={<Radio data-testid={option.testId} />}
                />
              ))}
            </RadioGroup>
          </FormControl>
        )}
      />

      {expiry === 'CUSTOM' && (
        <Controller
          control={control}
          name="custom_expires_at"
          render={({ field, fieldState }) => (
            <Box data-testid="status-expires-at">
              <DateTimePicker
                label={t('marketing.status.expiresAt')}
                value={field.value}
                onChange={field.onChange}
                disablePast
                slotProps={{
                  textField: {
                    fullWidth: true,
                    required: true,
                    error: !!fieldState.error,
                    helperText: fieldState.error?.message ?? t('marketing.status.expiryHint'),
                  },
                }}
              />
            </Box>
          )}
        />
      )}

      <Controller
        control={control}
        name="is_active"
        render={({ field }) => (
          <FormControlLabel
            label={t('shell.common.active')}
            control={
              <Switch
                checked={field.value}
                onChange={(_, checked) => field.onChange(checked)}
                data-testid="status-active-switch"
              />
            }
          />
        )}
      />
    </Stack>
  );
}
