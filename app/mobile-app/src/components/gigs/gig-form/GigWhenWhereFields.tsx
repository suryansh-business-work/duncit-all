import { Controller, useController, type Control } from 'react-hook-form';
import { GIG_EVENT_TYPES, gigEventTypeKey, type GigJobFormValues } from '@duncit/utils';

import { ChipSelectField } from '@/components/create-pod/ChipSelectField';
import { RepeatEndDateField } from '@/components/create-pod/repeat/RepeatEndDateField';
import { FormTextField } from '@/components/FormTextField';
import { useTranslation } from '@/hooks/useTranslation';
import { GigPlaceField } from '../GigPlaceField';

/** Event type, day, place, budget and headcount. mWeb twin: GigWhenWhereFields. */
export function GigWhenWhereFields({ control }: Readonly<{ control: Control<GigJobFormValues> }>) {
  const { t } = useTranslation();
  const today = new Date();
  const city = useController({ control, name: 'location_id' });
  const area = useController({ control, name: 'locality' });

  return (
    <>
      <Controller
        control={control}
        name="event_type"
        render={({ field }) => (
          <ChipSelectField
            testID="gig-form-type"
            label={t('gigJobs.form.eventType')}
            options={GIG_EVENT_TYPES.map((type) => ({
              value: type,
              label: t(gigEventTypeKey(type)),
            }))}
            value={field.value}
            onChange={(next) =>
              field.onChange(GIG_EVENT_TYPES.find((type) => type === next) ?? 'EVENT')
            }
          />
        )}
      />
      <Controller
        control={control}
        name="event_date"
        render={({ field, fieldState }) => (
          <RepeatEndDateField
            testID="gig-form-date"
            label={t('gigJobs.form.eventDate')}
            hint={t('gigJobs.card.noDate')}
            value={field.value}
            onChange={field.onChange}
            minDate={today}
            error={fieldState.error?.message}
            required={false}
          />
        )}
      />
      <GigPlaceField
        testID="gig-form"
        label={t('gigJobs.form.city')}
        city={city.field}
        area={area.field}
        error={city.fieldState.error?.message}
      />
      <FormTextField control={control} name="location" label={t('gigJobs.form.location')} />
      <FormTextField
        control={control}
        name="budget"
        label={t('gigJobs.form.budget')}
        hint={t('gigJobs.form.budgetHint')}
        keyboardType="number-pad"
      />
      <FormTextField
        control={control}
        name="openings"
        label={t('gigJobs.form.openings')}
        keyboardType="number-pad"
        required
      />
    </>
  );
}
