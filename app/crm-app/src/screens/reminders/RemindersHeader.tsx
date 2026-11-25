import { ScrollView } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack, YStack, useTheme } from 'tamagui';
import type { CrmCalendarEntityFilter, CrmCalendarStatusFilter } from '@duncit/utils';

import { DuncitButton } from '@/components/DuncitButton';
import {
  CALENDAR_VIEWS,
  VIEW_LABEL_KEY,
  stepCursor,
  viewTitle,
  type CalendarView,
} from '@/features/reminders/calendarView';
import { useTranslation } from '@/hooks/useTranslation';

interface Props {
  view: CalendarView;
  cursor: Date;
  entity: CrmCalendarEntityFilter;
  status: CrmCalendarStatusFilter;
  followUpsError: string | null;
  onView: (view: CalendarView) => void;
  onCursor: (cursor: Date) => void;
  onEntity: (entity: CrmCalendarEntityFilter) => void;
  onStatus: (status: CrmCalendarStatusFilter) => void;
  onAdd: () => void;
}

/** A row of one-tap choices that scrolls under the screen edges. */
function ChoiceRow<T extends string>({
  label,
  options,
  value,
  onPick,
  testID,
}: Readonly<{
  label: string;
  options: { value: T; label: string }[];
  value: T;
  onPick: (value: T) => void;
  testID: string;
}>) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={{ marginHorizontal: -16 }}
      contentContainerStyle={{ paddingHorizontal: 16 }}
    >
      <XStack gap="$2" role="radiogroup" aria-label={label}>
        {options.map((option) => (
          <DuncitButton
            key={option.value}
            label={option.label}
            onPress={() => onPick(option.value)}
            variant={option.value === value ? 'solid' : 'outline'}
            size="sm"
            testID={`${testID}-${option.value}`}
          />
        ))}
      </XStack>
    </ScrollView>
  );
}

/** The calendar's head: Add, the views, the period with previous / today / next, and the Type and Status filters. */
export function RemindersHeader(props: Readonly<Props>) {
  const { view, cursor } = props;
  const { t } = useTranslation();
  const theme = useTheme();
  const arrow = (dir: 1 | -1) => (
    <XStack
      role="button"
      aria-label={dir === 1 ? t('crm.a11y.nextPeriod') : t('crm.a11y.previousPeriod')}
      onPress={() => props.onCursor(stepCursor(view, cursor, dir))}
      padding="$2"
      hitSlop={8}
      testID={dir === 1 ? 'calendar-next' : 'calendar-previous'}
    >
      <MaterialIcons
        name={dir === 1 ? 'chevron-right' : 'chevron-left'}
        size={26}
        color={theme.accentText?.val}
      />
    </XStack>
  );
  return (
    <YStack gap="$2" marginBottom="$3">
      <Text color="$muted">{t('crm.reminders.subtitle')}</Text>
      <DuncitButton
        label={t('crmApp.reminder.title')}
        onPress={props.onAdd}
        testID="reminders-add"
      />
      <ChoiceRow
        label={t('shell.common.view')}
        options={CALENDAR_VIEWS.map((v) => ({ value: v, label: t(VIEW_LABEL_KEY[v]) }))}
        value={view}
        onPick={props.onView}
        testID="calendar-view"
      />
      <XStack alignItems="center" gap="$1">
        {view === 'upcoming' ? null : arrow(-1)}
        <Text
          flex={1}
          fontWeight="700"
          textAlign={view === 'upcoming' ? 'left' : 'center'}
          role="heading"
          aria-live="polite"
          testID="calendar-title"
        >
          {viewTitle(view, cursor, t)}
        </Text>
        {view === 'upcoming' ? null : arrow(1)}
      </XStack>
      {view === 'upcoming' ? null : (
        <DuncitButton
          label={t('crm.components.today')}
          onPress={() => props.onCursor(new Date())}
          variant="ghost"
          size="sm"
          testID="calendar-today"
        />
      )}
      <ChoiceRow
        label={t('shell.common.type')}
        options={[
          { value: 'ALL' as const, label: t('crm.calendar.all') },
          { value: 'VENUE_LEAD' as const, label: t('crm.common.venue') },
          { value: 'HOST_LEAD' as const, label: t('crm.common.host') },
        ]}
        value={props.entity}
        onPick={props.onEntity}
        testID="calendar-type"
      />
      <ChoiceRow
        label={t('shell.common.status')}
        options={[
          { value: 'ALL' as const, label: t('crm.calendar.all') },
          { value: 'PENDING' as const, label: t('crm.components.pending') },
          { value: 'DONE' as const, label: t('crm.components.done') },
        ]}
        value={props.status}
        onPick={props.onStatus}
        testID="calendar-status"
      />
      {props.followUpsError ? (
        <Text color="$danger" role="alert" fontSize="$2">
          {props.followUpsError}
        </Text>
      ) : null}
    </YStack>
  );
}
