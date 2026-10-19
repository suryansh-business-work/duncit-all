import { Controller } from 'react-hook-form';
import { MenuItem, Stack } from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { RhfTextField } from '@duncit/forms';
import { useTranslation } from '@duncit/app-settings';
import { parseIsoDay, toIsoDay } from '@duncit/datetime';
import { GIG_EVENT_TYPES, gigEventTypeKey } from '@duncit/utils';
import type { GigJobSectionProps } from './gig-job.types';

/**
 * Event type, date, place, budget and headcount. The date stores 'yyyy-MM-dd'
 * and reads in the admin's configured pattern (the surface's
 * DuncitLocalizationProvider), never the browser's own date order.
 */
export default function GigWhenWhereFields({ control }: Readonly<GigJobSectionProps>) {
  const { t } = useTranslation();

  return (
    <>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
        <RhfTextField control={control} name="event_type" label={t('gigJobs.form.eventType')} select>
          {GIG_EVENT_TYPES.map((type) => (
            <MenuItem key={type} value={type}>
              {t(gigEventTypeKey(type))}
            </MenuItem>
          ))}
        </RhfTextField>
        <Controller
          control={control}
          name="event_date"
          render={({ field, fieldState }) => (
            <DatePicker
              label={t('gigJobs.form.eventDate')}
              value={parseIsoDay(field.value)}
              onChange={(picked) => field.onChange(picked ? toIsoDay(picked) : '')}
              disablePast
              slotProps={{
                textField: {
                  fullWidth: true,
                  onBlur: field.onBlur,
                  error: !!fieldState.error,
                  helperText: fieldState.error?.message ?? ' ',
                },
                field: { clearable: true },
              }}
            />
          )}
        />
      </Stack>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
        <RhfTextField control={control} name="city" label={t('gigJobs.form.city')} data-testid="gig-form-city" />
        <RhfTextField control={control} name="location" label={t('gigJobs.form.location')} />
      </Stack>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
        <RhfTextField
          control={control}
          name="budget"
          label={t('gigJobs.form.budget')}
          hint={t('gigJobs.form.budgetHint')}
          slotProps={{ htmlInput: { inputMode: 'numeric' } }}
        />
        <RhfTextField
          control={control}
          name="openings"
          label={t('gigJobs.form.openings')}
          slotProps={{ htmlInput: { inputMode: 'numeric' } }}
        />
      </Stack>
    </>
  );
}
