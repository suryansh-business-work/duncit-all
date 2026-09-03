import { XStack, YStack } from 'tamagui';
import { weekdayLabels } from '@duncit/slots';

import { DuncitButton } from '@/components/DuncitButton';
import { FieldLabel } from '@/components/Field';
import { useTranslation } from '@/hooks/useTranslation';
import { SelectChip } from '../SelectChip';

const ALL_DAYS = [0, 1, 2, 3, 4, 5, 6];
const WORK_DAYS = [1, 2, 3, 4, 5];
const WEEKEND = [0, 6];

interface Props {
  value: number[];
  onChange: (next: number[]) => void;
  /** Days the venue is closed on — drawn faint, still selectable. */
  weeklyOff?: readonly number[];
  testID: string;
}

/** The repeat-on picker: three presets and seven day chips, Sunday first the
 * way `Date#getDay` counts — the Tamagui twin of the MUI DayOfWeekPicker. */
export function WeekdayChips({ value, onChange, weeklyOff = [], testID }: Readonly<Props>) {
  const { t } = useTranslation();
  const labels = weekdayLabels(t);
  const presets = [
    { id: 'all', label: t('availability.recurring.all'), days: ALL_DAYS },
    { id: 'weekdays', label: t('availability.recurring.weekdays'), days: WORK_DAYS },
    { id: 'weekends', label: t('availability.recurring.weekends'), days: WEEKEND },
  ];
  const selected = new Set(value);
  const toggle = (day: number) => {
    const next = new Set(value);
    if (next.has(day)) next.delete(day);
    else next.add(day);
    onChange([...next].sort((a, b) => a - b));
  };

  return (
    <YStack gap={6} testID={testID}>
      <XStack alignItems="center" justifyContent="space-between" flexWrap="wrap" gap={4}>
        <FieldLabel label={t('availability.recurring.repeatOn')} />
        <XStack gap={2}>
          {presets.map((preset) => (
            <DuncitButton
              key={preset.id}
              testID={`${testID}-preset-${preset.id}`}
              label={preset.label}
              onPress={() => onChange([...preset.days])}
              variant="ghost"
              size="sm"
            />
          ))}
        </XStack>
      </XStack>
      <XStack gap={6} flexWrap="wrap" aria-label={t('availability.recurring.repeatOnDays')}>
        {labels.full.map((fullName, day) => (
          <SelectChip
            key={fullName}
            testID={`${testID}-day-${day}`}
            label={labels.short[day] ?? ''}
            ariaLabel={fullName}
            selected={selected.has(day)}
            dim={weeklyOff.includes(day)}
            onPress={() => toggle(day)}
          />
        ))}
      </XStack>
    </YStack>
  );
}
