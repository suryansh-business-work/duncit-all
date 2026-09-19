import { useMemo } from 'react';
import { Controller, type Control } from 'react-hook-form';
import { FormControlLabel, Stack, Switch } from '@mui/material';
import { RhfTextField } from '@duncit/forms';
import { SectionCard } from '@duncit/ui';
import { useWebT } from '../../../../shared/i18n';
import { RhfSelect, type SelectOption } from '../../../components/RhfSelect';
import { VISIBILITIES, type EventFormValues } from '../event.types';

interface SettingsSectionProps {
  control: Control<EventFormValues>;
  categories: readonly SelectOption[];
  calendars: readonly SelectOption[];
}

/** Who can find it, how many can come, whether the host approves each guest, and where it is filed. */
export function SettingsSection({ control, categories, calendars }: Readonly<SettingsSectionProps>) {
  const { t } = useWebT();
  const visibilities = useMemo(() => VISIBILITIES.map((value) => ({ value, label: t(`lite.visibility.${value}`) })), [t]);
  return (
    <SectionCard title={t('liteWeb.eventForm.settings')} subtitle={t('liteWeb.eventForm.settingsHint')}>
      <Stack spacing={2}>
        <RhfSelect control={control} name="visibility" label={t('liteWeb.eventForm.visibility')} options={visibilities} hint={t('liteWeb.eventForm.visibilityHint')} testId="event-visibility" />
        <RhfTextField
          control={control}
          name="capacity"
          label={t('liteWeb.eventForm.capacity')}
          hint={t('liteWeb.eventForm.capacityHint')}
          slotProps={{ htmlInput: { inputMode: 'numeric', 'data-testid': 'event-capacity' } }}
        />
        <Controller
          control={control}
          name="require_approval"
          render={({ field }) => (
            <FormControlLabel
              control={<Switch checked={field.value} onChange={(event) => field.onChange(event.target.checked)} slotProps={{ input: { 'data-testid': 'event-require-approval' } as Record<string, string> }} />}
              label={t('liteWeb.eventForm.requireApproval')}
            />
          )}
        />
        <RhfSelect control={control} name="category_id" label={t('liteWeb.eventForm.category')} options={categories} emptyLabel={t('liteWeb.eventForm.noCategory')} hint={t('liteWeb.eventForm.categoryHint')} testId="event-category" />
        <RhfSelect control={control} name="calendar_id" label={t('liteWeb.eventForm.calendar')} options={calendars} emptyLabel={t('liteWeb.eventForm.noCalendar')} hint={t('liteWeb.eventForm.calendarHint')} testId="event-calendar" />
      </Stack>
    </SectionCard>
  );
}
