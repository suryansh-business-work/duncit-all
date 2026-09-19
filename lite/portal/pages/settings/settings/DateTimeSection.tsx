import { Controller, type Control } from 'react-hook-form';
import { Autocomplete, Stack, TextField } from '@mui/material';
import { RhfTextField } from '@duncit/forms';
import { SectionCard } from '@duncit/ui';
import { usePortalT } from '../../../../shared/i18n';
import { TIME_ZONES, type SettingsFormValues } from './settings.types';

interface Props {
  control: Control<SettingsFormValues>;
  busy: boolean;
}

/** The zone new events default to, and the date-fns patterns every date is shown in. */
export function DateTimeSection({ control, busy }: Readonly<Props>) {
  const { t } = usePortalT();
  return (
    <SectionCard title={t('litePortal.settings.dateTime')}>
      <Stack spacing={1.5}>
        <Controller
          control={control}
          name="default_timezone"
          render={({ field, fieldState }) => (
            <Autocomplete
              options={TIME_ZONES}
              value={field.value || null}
              onChange={(_event, value) => field.onChange(value ?? '')}
              onBlur={field.onBlur}
              disabled={busy}
              autoHighlight
              renderInput={(params) => (
                <TextField
                  {...params}
                  inputRef={field.ref}
                  label={t('litePortal.settings.timezone')}
                  required
                  error={Boolean(fieldState.error)}
                  helperText={fieldState.error?.message ?? t('litePortal.settings.timezoneHint')}
                  slotProps={{ htmlInput: { ...params.inputProps, 'data-testid': 'settings-timezone' } }}
                />
              )}
            />
          )}
        />
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
          <RhfTextField control={control} name="date_format" label={t('litePortal.settings.dateFormat')} hint={t('litePortal.settings.dateFormatHint')} required disabled={busy} slotProps={{ htmlInput: { 'data-testid': 'settings-date-format' } }} />
          <RhfTextField control={control} name="time_format" label={t('litePortal.settings.timeFormat')} hint={t('litePortal.settings.timeFormatHint')} required disabled={busy} slotProps={{ htmlInput: { 'data-testid': 'settings-time-format' } }} />
        </Stack>
      </Stack>
    </SectionCard>
  );
}
