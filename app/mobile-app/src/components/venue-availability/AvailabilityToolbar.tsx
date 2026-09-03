import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack, YStack } from 'tamagui';
import { PRESS_STYLE } from '@duncit/buttons-native';

import { DuncitButton } from '@/components/DuncitButton';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useTranslation } from '@/hooks/useTranslation';
import { SelectChip } from './SelectChip';
import type { CalendarView } from './availability-grid';

const VIEWS: readonly CalendarView[] = ['day', 'week', 'month'];

interface ArrowProps {
  testID: string;
  label: string;
  icon: 'chevron-left' | 'chevron-right';
  enabled: boolean;
  tint: string;
  onPress: () => void;
}

/** One of the two period arrows; inert and dimmed at the window's edge. */
function PeriodArrow({ testID, label, icon, enabled, tint, onPress }: Readonly<ArrowProps>) {
  return (
    <XStack
      testID={testID}
      role="button"
      aria-label={label}
      aria-disabled={!enabled}
      onPress={enabled ? onPress : undefined}
      width={36}
      height={36}
      alignItems="center"
      justifyContent="center"
      opacity={enabled ? 1 : 0.3}
      pressStyle={PRESS_STYLE.inline}
    >
      <MaterialIcons name={icon} size={24} color={tint} />
    </XStack>
  );
}

interface Props {
  view: CalendarView;
  onView: (view: CalendarView) => void;
  /** "August 2026", "03 Aug – 09 Aug" or the single day, per the active view. */
  periodLabel: string;
  onShift: (direction: 1 | -1) => void;
  /** False at the end of the booking window — there is nothing further to show. */
  canGoNext: boolean;
  onToday: () => void;
  onRecurring: () => void;
}

/**
 * The calendar's controls: which view, which period, and the way into the
 * recurring-availability sheet. Stateless — the screen owns the anchor. The
 * Tamagui twin of the MUI CalendarToolbar (rule 27).
 */
export function AvailabilityToolbar({
  view,
  onView,
  periodLabel,
  onShift,
  canGoNext,
  onToday,
  onRecurring,
}: Readonly<Props>) {
  const { t } = useTranslation();
  const { muted } = useThemeColors();
  const viewLabels: Record<CalendarView, string> = {
    day: t('availability.toolbar.day'),
    week: t('availability.toolbar.week'),
    month: t('availability.toolbar.month'),
  };

  return (
    <YStack gap={8} testID="availability-toolbar">
      <XStack alignItems="center" justifyContent="space-between" gap={8} flexWrap="wrap">
        <XStack gap={6} aria-label={t('availability.toolbar.calendarView')}>
          {VIEWS.map((option) => (
            <SelectChip
              key={option}
              testID={`availability-view-${option}`}
              label={viewLabels[option]}
              selected={option === view}
              onPress={() => onView(option)}
            />
          ))}
        </XStack>
        <DuncitButton
          testID="availability-recurring"
          label={t('availability.toolbar.recurring')}
          onPress={onRecurring}
          variant="outline"
          size="sm"
        />
      </XStack>

      <XStack alignItems="center" justifyContent="space-between" paddingHorizontal={4}>
        <PeriodArrow
          testID="availability-period-prev"
          label={t('availability.toolbar.previous')}
          icon="chevron-left"
          enabled
          tint={muted}
          onPress={() => onShift(-1)}
        />
        <Text testID="availability-period" fontSize={14} fontWeight="600" color="$color">
          {periodLabel}
        </Text>
        <PeriodArrow
          testID="availability-period-next"
          label={t('availability.toolbar.next')}
          icon="chevron-right"
          enabled={canGoNext}
          tint={muted}
          onPress={() => onShift(1)}
        />
        <DuncitButton
          testID="availability-today"
          label={t('availability.toolbar.today')}
          onPress={onToday}
          variant="ghost"
          size="sm"
        />
      </XStack>
    </YStack>
  );
}
