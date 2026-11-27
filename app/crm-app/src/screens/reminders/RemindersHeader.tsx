import { Text, YStack } from 'tamagui';
import type { CrmCalendarEntityFilter, CrmCalendarStatusFilter } from '@duncit/utils';

import { FilterChips } from '@/components/mobile/FilterChips';
import { MOBILE } from '@/constants/design';
import {
  CALENDAR_VIEWS,
  VIEW_LABEL_KEY,
  type CalendarView,
} from '@/features/reminders/calendarView';
import { useTranslation } from '@/hooks/useTranslation';
import { CalendarPeriodNav } from './CalendarPeriodNav';

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
}

/** The pill rows run edge to edge, past the list's side padding. */
const EDGE = { marginHorizontal: -MOBILE.gutter } as const;

/**
 * The calendar's head, compact so the agenda starts high on the screen: the
 * views as pills, the period with previous / Today / next on one line, then
 * the Type and Status filters. Add is the screen's floating button.
 */
export function RemindersHeader(props: Readonly<Props>) {
  const { view, cursor } = props;
  const { t } = useTranslation();
  return (
    <YStack gap="$2" marginBottom="$3">
      <YStack {...EDGE}>
        <FilterChips
          label={t('shell.common.view')}
          options={CALENDAR_VIEWS.map((v) => ({ key: v, label: t(VIEW_LABEL_KEY[v]) }))}
          value={view}
          onChange={props.onView}
          testID="calendar-view"
        />
      </YStack>
      <CalendarPeriodNav view={view} cursor={cursor} onCursor={props.onCursor} />
      <YStack {...EDGE} gap="$2">
        <FilterChips
          label={t('shell.common.type')}
          showLabel
          options={[
            { key: 'ALL' as const, label: t('crm.calendar.all') },
            { key: 'VENUE_LEAD' as const, label: t('crm.common.venue') },
            { key: 'HOST_LEAD' as const, label: t('crm.common.host') },
          ]}
          value={props.entity}
          onChange={props.onEntity}
          testID="calendar-type"
        />
        <FilterChips
          label={t('shell.common.status')}
          showLabel
          options={[
            { key: 'ALL' as const, label: t('crm.calendar.all') },
            { key: 'PENDING' as const, label: t('crm.components.pending') },
            { key: 'DONE' as const, label: t('crm.components.done') },
          ]}
          value={props.status}
          onChange={props.onStatus}
          testID="calendar-status"
        />
      </YStack>
      {props.followUpsError ? (
        <Text color="$danger" role="alert" fontSize="$2">
          {props.followUpsError}
        </Text>
      ) : null}
    </YStack>
  );
}
