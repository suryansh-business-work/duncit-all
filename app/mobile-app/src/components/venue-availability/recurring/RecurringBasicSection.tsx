import { addDays } from 'date-fns';
import { YStack } from 'tamagui';
import { effectiveMaxAdvance, type VenueSettingsView } from '@duncit/slots';

import { ToggleRow } from '@/components/ToggleRow';
import { useTranslation } from '@/hooks/useTranslation';
import { appNow } from '@/utils/app-formatter';
import { DateTimePickerField } from '../DateTimePickerField';
import { ConflictModeSection } from './ConflictModeSection';
import type { RecurringForm } from './recurring-form';
import { SpacePricingSection } from './SpacePricingSection';
import { TimeRangesSection } from './TimeRangesSection';
import { WeekdayChips } from './WeekdayChips';

interface Props {
  form: RecurringForm;
  patch: (p: Partial<RecurringForm>) => void;
  settings: VenueSettingsView;
}

/** The recurring run itself: a date range, the weekdays, whole days or daily
 * windows, a price per space and what to do on a clash. */
export function RecurringBasicSection({ form, patch, settings }: Readonly<Props>) {
  const { t } = useTranslation();
  const now = appNow();
  // The venue's own advance-booking limit bounds how far the run may reach;
  // the pickers say so through the hint rather than refusing after the fact.
  const maxDays = effectiveMaxAdvance(settings.rules.max_advance_days);
  const reachHint = t('availability.maxAhead', { vars: { days: maxDays } });
  const lastDay = addDays(now, maxDays);

  return (
    <YStack gap={14}>
      <DateTimePickerField
        testID="recurring-start-date"
        label={t('availability.startDate')}
        value={form.startDate}
        onChange={(startDate) => patch({ startDate })}
        minDateTime={now}
      />
      <DateTimePickerField
        testID="recurring-end-date"
        label={t('availability.endDate')}
        value={form.endDate}
        onChange={(endDate) => patch({ endDate })}
        minDateTime={form.startDate ?? now}
        hint={form.endDate && form.endDate > lastDay ? reachHint : undefined}
      />
      <WeekdayChips
        testID="recurring-weekdays"
        value={form.weekdays}
        onChange={(weekdays) => patch({ weekdays })}
        weeklyOff={settings.weekly_off_days}
      />
      <ToggleRow
        testID="recurring-whole-day"
        label={t('availability.wholeDay')}
        hint={t('availability.recurring.wholeDayHint')}
        value={form.wholeDay}
        onChange={(wholeDay) => patch({ wholeDay })}
      />
      {form.wholeDay ? null : (
        <TimeRangesSection
          timeSlots={form.timeSlots}
          onChange={(timeSlots) => patch({ timeSlots })}
          openHours={settings.operating_hours}
          bufferMinutes={settings.rules.buffer_minutes}
        />
      )}
      <SpacePricingSection spaces={form.spaces} onChange={(spaces) => patch({ spaces })} />
      <ConflictModeSection
        value={form.conflictMode}
        onChange={(conflictMode) => patch({ conflictMode })}
      />
    </YStack>
  );
}
