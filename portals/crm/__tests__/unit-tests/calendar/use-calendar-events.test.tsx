import { describe, expect, it } from 'vitest';
import type { ReactNode } from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import type { MockedResponse } from '@apollo/client/testing';
import { MockedProvider } from '@apollo/client/testing/react';
import { useCalendarEvents } from '@/components/calendar/useCalendarEvents';
import { CRM_REMINDERS, type CrmReminder } from '@/api/reminders.gql';
import { HOST_LEADS, VENUE_LEADS } from '@/api/crm.gql';
import { hostLead } from '../fixtures/leads';

const reminder = (overrides: Partial<CrmReminder>): CrmReminder => ({
  id: 'rem',
  entity_type: 'HOST_LEAD',
  lead_id: 'host-1',
  title: 'Reminder',
  due_at: '2026-09-15T12:00:00.000Z',
  notes: null,
  status: 'PENDING',
  assigned_to: null,
  ...overrides,
});

const mocks = (reminders: CrmReminder[]): MockedResponse[] => [
  { request: { query: CRM_REMINDERS, variables: { filter: {} } }, result: { data: { crmReminders: reminders } } },
  { request: { query: VENUE_LEADS, variables: { filter: {} } }, result: { data: { venueLeads: [] } } },
  {
    request: { query: HOST_LEADS, variables: { filter: {} } },
    result: { data: { hostLeads: [hostLead({ id: 'host-1', host_name: 'Bike Club', next_follow_up_date: null })] } },
  },
];

const wrapperFor = (list: MockedResponse[]) =>
  function Wrapper({ children }: Readonly<{ children: ReactNode }>) {
    return (
      <MockedProvider mockLinkDefaultOptions={{ delay: 0 }} mocks={list}>
        {children}
      </MockedProvider>
    );
  };

describe('useCalendarEvents', () => {
  it('names a host reminder from its lead, and leaves one with no lead unnamed', async () => {
    const { result } = renderHook(() => useCalendarEvents('HOST_LEAD', 'ALL'), {
      wrapper: wrapperFor(
        mocks([
          reminder({ id: 'linked', title: 'Confirm Sunday run' }),
          reminder({ id: 'unlinked', lead_id: null, title: 'Chase new host', due_at: '2026-09-16T12:00:00.000Z' }),
        ]),
      ),
    });

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.events.map((e) => [e.id, e.leadName])).toEqual([
      ['r-linked', 'Bike Club'],
      ['r-unlinked', null],
    ]);
  });
});
