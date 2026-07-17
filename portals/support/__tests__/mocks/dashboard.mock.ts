import type { MockedResponse } from '@apollo/client/testing';
import { BOUNCER_CALLBACK_REQUESTS, BOUNCER_SOS_ALERTS } from '../../src/graphql/bouncer';
import { TICKETS } from '../../src/graphql/tickets';
import { SUPPORT_CHAT_SESSIONS } from '../../src/graphql/supportChat';

/**
 * Dashboard KPI mocks. Each stat card fires a `page_size: 1` count query and
 * reads only `total`; the empty `items` page wrappers carry the schema
 * `__typename` so the default `addTypename` cache is satisfied. `maxUsageCount`
 * absorbs the socket-driven refetches every card subscribes to.
 */
interface DashboardCounts {
  sos?: number;
  callbacks?: number;
  tickets?: number;
  chats?: number;
}

const countMock = (
  query: MockedResponse['request']['query'],
  status: string,
  key: string,
  typename: string,
  total: number,
): MockedResponse => ({
  request: { query, variables: { status, page_size: 1 } },
  result: {
    data: {
      [key]: { __typename: typename, items: [], total, page: 1, page_size: 1 },
    },
  },
  maxUsageCount: 5,
});

export const dashboardMocks = (counts: DashboardCounts = {}): MockedResponse[] => [
  countMock(BOUNCER_SOS_ALERTS, 'ACTIVE', 'bouncerSosAlerts', 'BouncerSosAlertPage', counts.sos ?? 2),
  countMock(
    BOUNCER_CALLBACK_REQUESTS,
    'PENDING',
    'bouncerCallbackRequests',
    'BouncerCallbackRequestPage',
    counts.callbacks ?? 1,
  ),
  countMock(TICKETS, 'OPEN', 'tickets', 'TicketPage', counts.tickets ?? 3),
  countMock(SUPPORT_CHAT_SESSIONS, 'OPEN', 'supportChatSessions', 'SupportChatSessionPage', counts.chats ?? 0),
];
