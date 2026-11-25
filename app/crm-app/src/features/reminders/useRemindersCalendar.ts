import { useCallback, useMemo, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { fireAndForget, logs } from '@duncit/logs';
import {
  crmCalendarEvents,
  type CrmCalendarEntityFilter,
  type CrmCalendarStatusFilter,
} from '@duncit/utils';

import { CrmAppRemindersDocument } from '@/graphql/reminders';
import { CrmAppCalendarFollowUpsDocument } from '@/graphql/remindersExtra';
import { useGqlQuery } from '@/hooks/useGqlQuery';
import type { Translate } from '@/i18n/fallback';
import type { CalendarView } from './calendarView';

const NO_VARS = {};
const SCOPE = 'crm-app/RemindersCalendar';

/**
 * CRM › Reminders (the portal's calendar): reminders and each venue and host
 * lead's next follow-up, filtered by kind and reminder status, in a view
 * (day, week, month, year, upcoming) around a date. Both reads run again each
 * time the tab is shown, so a reminder added elsewhere is already here.
 */
export function useRemindersCalendar(t: Translate) {
  const [view, setView] = useState<CalendarView>('upcoming');
  const [cursor, setCursor] = useState(() => new Date());
  const [entity, setEntity] = useState<CrmCalendarEntityFilter>('ALL');
  const [status, setStatus] = useState<CrmCalendarStatusFilter>('ALL');
  const fallbackError = t('crmApp.common.loadFailed');
  const reminderVars = useMemo(() => ({ filter: status === 'ALL' ? {} : { status } }), [status]);
  const reminders = useGqlQuery(CrmAppRemindersDocument, reminderVars, {
    fallbackError,
    skip: true,
  });
  const followUps = useGqlQuery(CrmAppCalendarFollowUpsDocument, NO_VARS, {
    fallbackError,
    skip: true,
  });

  const refetchReminders = reminders.refetch;
  const refetchFollowUps = followUps.refetch;
  useFocusEffect(
    useCallback(
      () => fireAndForget(refetchReminders(), logs.mobileApp, SCOPE, 'reminders'),
      [refetchReminders],
    ),
  );
  useFocusEffect(
    useCallback(
      () => fireAndForget(refetchFollowUps(), logs.mobileApp, SCOPE, 'followUps'),
      [refetchFollowUps],
    ),
  );

  const remindersData = reminders.data;
  const followUpsData = followUps.data;
  const events = useMemo(
    () =>
      crmCalendarEvents({
        reminders: remindersData?.crmReminders ?? [],
        venueLeads: (followUpsData?.venueLeads ?? []).map((l) => ({
          id: l.id,
          name: l.venue_name,
          next_follow_up_date: l.next_follow_up_date,
        })),
        hostLeads: (followUpsData?.hostLeads ?? []).map((l) => ({
          id: l.id,
          name: l.host_name,
          next_follow_up_date: l.next_follow_up_date,
        })),
        entity,
        status,
        followUpTitle: (name) => t('crm.calendar.followUpTitle', { vars: { name } }),
      }),
    [remindersData, followUpsData, entity, status, t],
  );

  const refresh = useCallback(() => {
    fireAndForget(refetchReminders(), logs.mobileApp, SCOPE, 'reminders');
    fireAndForget(refetchFollowUps(), logs.mobileApp, SCOPE, 'followUps');
  }, [refetchReminders, refetchFollowUps]);

  return {
    view,
    setView,
    cursor,
    setCursor,
    entity,
    setEntity,
    status,
    setStatus,
    events,
    loaded: remindersData !== null,
    loading: reminders.loading,
    error: reminders.error,
    followUpsError: followUps.error,
    refetchReminders,
    refresh,
  };
}
