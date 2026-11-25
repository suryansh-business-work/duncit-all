import { useMemo } from 'react';
import { useQuery } from '@apollo/client/react';
import { CRM_REMINDERS, type CrmReminder, type ReminderEntity } from '../../api/reminders.gql';
import { HOST_LEADS, VENUE_LEADS } from '../../api/crm.gql';
import type { HostLead, VenueLead } from '../../api/crm.types';
import { useTranslation } from '@duncit/shell';
import { crmCalendarEvents } from '@duncit/utils';

export type EntityFilter = 'ALL' | 'VENUE_LEAD' | 'HOST_LEAD';
export type StatusFilter = 'ALL' | 'PENDING' | 'DONE';

export interface CalEvent {
  id: string;
  date: Date;
  title: string;
  kind: 'reminder' | 'followup';
  status?: 'PENDING' | 'DONE';
  entity: ReminderEntity;
  leadId?: string | null;
  /** Resolved venue/host name for the linked lead, when known. */
  leadName?: string | null;
  notes?: string | null;
  reminder?: CrmReminder;
}

/**
 * Unified calendar events = CRM reminders (editable) + each lead's
 * next_follow_up_date (read-only). Filtered by entity + reminder status.
 */
export function useCalendarEvents(entity: EntityFilter, status: StatusFilter) {
  const { t } = useTranslation();
  const { data: rem, loading: l1, refetch } = useQuery<{ crmReminders: CrmReminder[] }>(CRM_REMINDERS, {
    variables: { filter: status === 'ALL' ? {} : { status } },
    fetchPolicy: 'cache-and-network',
  });
  const { data: vd, loading: l2 } = useQuery<{ venueLeads: VenueLead[] }>(VENUE_LEADS, { variables: { filter: {} }, fetchPolicy: 'cache-and-network' });
  const { data: hd, loading: l3 } = useQuery<{ hostLeads: HostLead[] }>(HOST_LEADS, { variables: { filter: {} }, fetchPolicy: 'cache-and-network' });

  // Reminders + each lead's next follow-up, built by the rule the Duncit CRM app shares (@duncit/utils).
  const events = useMemo<CalEvent[]>(
    () =>
      crmCalendarEvents({
        reminders: rem?.crmReminders ?? [],
        venueLeads: (vd?.venueLeads ?? []).map((l) => ({ id: l.id, name: l.venue_name, next_follow_up_date: l.next_follow_up_date })),
        hostLeads: (hd?.hostLeads ?? []).map((l) => ({ id: l.id, name: l.host_name, next_follow_up_date: l.next_follow_up_date })),
        entity,
        status,
        followUpTitle: (name) => t('crm.calendar.followUpTitle', { vars: { name } }),
      }),
    [rem, vd, hd, entity, status, t]
  );

  return { events, loading: l1 || l2 || l3, refetch };
}
