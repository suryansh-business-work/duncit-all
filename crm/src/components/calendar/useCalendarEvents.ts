import { useMemo } from 'react';
import { useQuery } from '@apollo/client';
import { CRM_REMINDERS, type CrmReminder } from '../../api/reminders.gql';
import { HOST_LEADS, VENUE_LEADS } from '../../api/crm.gql';
import type { HostLead, VenueLead } from '../../api/crm.types';

export type EntityFilter = 'ALL' | 'VENUE_LEAD' | 'HOST_LEAD';
export type StatusFilter = 'ALL' | 'PENDING' | 'DONE';

export interface CalEvent {
  id: string;
  date: Date;
  title: string;
  kind: 'reminder' | 'followup';
  status?: 'PENDING' | 'DONE';
  entity: 'VENUE_LEAD' | 'HOST_LEAD' | 'GENERAL';
  leadId?: string | null;
  /** Resolved venue/host name for the linked lead, when known. */
  leadName?: string | null;
  notes?: string | null;
  reminder?: CrmReminder;
}

const valid = (iso?: string | null) => {
  if (!iso) return null;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d;
};

/**
 * Unified calendar events = CRM reminders (editable) + each lead's
 * next_follow_up_date (read-only). Filtered by entity + reminder status.
 */
export function useCalendarEvents(entity: EntityFilter, status: StatusFilter) {
  const { data: rem, loading: l1, refetch } = useQuery<{ crmReminders: CrmReminder[] }>(CRM_REMINDERS, {
    variables: { filter: status === 'ALL' ? {} : { status } },
    fetchPolicy: 'cache-and-network',
  });
  const { data: vd, loading: l2 } = useQuery<{ venueLeads: VenueLead[] }>(VENUE_LEADS, { variables: { filter: {} }, fetchPolicy: 'cache-and-network' });
  const { data: hd, loading: l3 } = useQuery<{ hostLeads: HostLead[] }>(HOST_LEADS, { variables: { filter: {} }, fetchPolicy: 'cache-and-network' });

  // id → display name maps, used to label reminders attached to a lead.
  const nameMaps = useMemo(() => {
    const venue = new Map((vd?.venueLeads ?? []).map((l) => [l.id, l.venue_name]));
    const host = new Map((hd?.hostLeads ?? []).map((l) => [l.id, l.host_name]));
    return { venue, host };
  }, [vd, hd]);

  const events = useMemo<CalEvent[]>(() => {
    const out: CalEvent[] = [];
    const nameFor = (ent: string, id?: string | null) =>
      ent === 'VENUE_LEAD' ? nameMaps.venue.get(id ?? '') ?? null : ent === 'HOST_LEAD' ? nameMaps.host.get(id ?? '') ?? null : null;
    for (const r of rem?.crmReminders ?? []) {
      const d = valid(r.due_at);
      if (!d) continue;
      if (entity !== 'ALL' && r.entity_type !== entity) continue;
      out.push({ id: `r-${r.id}`, date: d, title: r.title, kind: 'reminder', status: r.status, entity: r.entity_type, leadId: r.lead_id, leadName: nameFor(r.entity_type, r.lead_id), notes: r.notes, reminder: r });
    }
    const addFollowups = (leads: any[], ent: 'VENUE_LEAD' | 'HOST_LEAD', nameKey: string) => {
      if (entity !== 'ALL' && entity !== ent) return;
      for (const l of leads) {
        const d = valid(l.next_follow_up_date);
        if (!d) continue;
        out.push({ id: `f-${ent}-${l.id}`, date: d, title: `Follow-up · ${l[nameKey]}`, kind: 'followup', entity: ent, leadId: l.id, leadName: l[nameKey] });
      }
    };
    // Follow-ups are leads, not reminders — only include when status filter isn't DONE-only.
    if (status !== 'DONE') {
      addFollowups(vd?.venueLeads ?? [], 'VENUE_LEAD', 'venue_name');
      addFollowups(hd?.hostLeads ?? [], 'HOST_LEAD', 'host_name');
    }
    return out.sort((a, b) => a.date.getTime() - b.date.getTime());
  }, [rem, vd, hd, entity, status, nameMaps]);

  return { events, loading: l1 || l2 || l3, refetch };
}
