import { Text, XStack, YStack } from 'tamagui';

import { DuncitButton } from '@/components/DuncitButton';
import { FieldLabel } from '@/components/Field';
import { RowIconButton } from '@/components/host-manage/ActionRow';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useTranslation } from '@/hooks/useTranslation';
import { TimePickerField } from '../TimePickerField';
import { newTimeRange, type TimeRangeRow } from './recurring-form';

interface Props {
  timeSlots: TimeRangeRow[];
  onChange: (next: TimeRangeRow[]) => void;
  openHours: { open: string; close: string };
  bufferMinutes: number;
}

/** One or more start/end windows per day. Adjacent windows must keep the
 * venue's buffer gap — the generator validates it; the hint states it. */
export function TimeRangesSection({
  timeSlots,
  onChange,
  openHours,
  bufferMinutes,
}: Readonly<Props>) {
  const { t } = useTranslation();
  const { muted } = useThemeColors();
  const setRow = (id: string, p: Partial<TimeRangeRow>) =>
    onChange(timeSlots.map((row) => (row.id === id ? { ...row, ...p } : row)));
  const addRow = () => onChange([...timeSlots, newTimeRange('15:00', '16:00')]);
  const removeRow = (id: string) => onChange(timeSlots.filter((row) => row.id !== id));

  const gapHint =
    bufferMinutes > 0
      ? t('availability.recurring.keepGap', { vars: { minutes: bufferMinutes } })
      : t('availability.recurring.noOverlap');
  const startLabel = (index: number) =>
    timeSlots.length > 1
      ? t('availability.recurring.startN', { vars: { n: index + 1 } })
      : t('availability.recurring.start');

  return (
    <YStack gap={8}>
      <FieldLabel label={t('availability.recurring.timeSlots')} />
      {timeSlots.map((row, index) => (
        <XStack key={row.id} gap={8} alignItems="flex-end">
          <YStack flex={1}>
            <TimePickerField
              testID={`recurring-start-${row.id}`}
              label={startLabel(index)}
              value={row.start}
              onChange={(start) => setRow(row.id, { start })}
            />
          </YStack>
          <YStack flex={1}>
            <TimePickerField
              testID={`recurring-end-${row.id}`}
              label={t('availability.recurring.end')}
              value={row.end}
              onChange={(end) => setRow(row.id, { end })}
            />
          </YStack>
          {timeSlots.length > 1 ? (
            <RowIconButton
              testID={`recurring-remove-${row.id}`}
              icon="delete-outline"
              label={t('availability.recurring.removeTimeSlot', { vars: { n: index + 1 } })}
              tint={muted}
              onPress={() => removeRow(row.id)}
            />
          ) : null}
        </XStack>
      ))}
      <XStack>
        <DuncitButton
          testID="recurring-add-range"
          label={t('availability.recurring.addRange')}
          onPress={addRow}
          variant="outline"
          tone="neutral"
          size="sm"
        />
      </XStack>
      <Text fontSize={11.5} color="$muted">
        {t('availability.recurring.venueHours', {
          vars: { open: openHours.open, close: openHours.close },
        })}{' '}
        {gapHint}
      </Text>
    </YStack>
  );
}
