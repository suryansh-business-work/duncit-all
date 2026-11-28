import { Text, XStack } from 'tamagui';

import { IconButton } from '@/components/mobile/IconButton';
import { MOBILE } from '@/constants/design';
import { stepCursor, viewTitle, type CalendarView } from '@/features/reminders/calendarView';
import { useTranslation } from '@/hooks/useTranslation';

interface Props {
  view: CalendarView;
  cursor: Date;
  onCursor: (cursor: Date) => void;
}

/**
 * The period a calendar shows, on one line: previous, its title, Today and
 * next. The upcoming view has no period to page, so it shows the title only.
 */
export function CalendarPeriodNav({ view, cursor, onCursor }: Readonly<Props>) {
  const { t } = useTranslation();
  const upcoming = view === 'upcoming';
  return (
    <XStack alignItems="center" gap="$1" minHeight={MOBILE.touch}>
      {upcoming ? null : (
        <IconButton
          icon={{ name: 'chevron-left' }}
          label={t('crm.a11y.previousPeriod')}
          onPress={() => onCursor(stepCursor(view, cursor, -1))}
          testID="calendar-previous"
        />
      )}
      <Text
        flex={1}
        fontWeight="700"
        fontSize="$5"
        textAlign={upcoming ? 'left' : 'center'}
        role="heading"
        aria-live="polite"
        testID="calendar-title"
      >
        {viewTitle(view, cursor, t)}
      </Text>
      {upcoming ? null : (
        <>
          <XStack
            role="button"
            aria-label={t('crm.components.today')}
            onPress={() => onCursor(new Date())}
            minHeight={MOBILE.touch}
            paddingHorizontal="$2"
            alignItems="center"
            testID="calendar-today"
          >
            <Text color="$accentText" fontWeight="600">
              {t('crm.components.today')}
            </Text>
          </XStack>
          <IconButton
            icon={{ name: 'chevron-right' }}
            label={t('crm.a11y.nextPeriod')}
            onPress={() => onCursor(stepCursor(view, cursor, 1))}
            testID="calendar-next"
          />
        </>
      )}
    </XStack>
  );
}
