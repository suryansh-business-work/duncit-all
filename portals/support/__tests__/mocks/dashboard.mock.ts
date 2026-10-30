import type { MockedResponse } from '@apollo/client/testing';
import { BOUNCER_CALLBACK_REQUESTS, BOUNCER_SOS_ALERTS } from '../../src/graphql/bouncer';
import { TICKETS } from '../../src/graphql/tickets';
import { SUPPORT_CHAT_SESSIONS } from '../../src/graphql/supportChat';
import { TUTORIAL_STATS } from '../../src/pages/tutorials/queries';
import { faqSubmissionsListMock, makeFaqSubmission } from './faq.mock';

/**
 * Dashboard KPI mocks. Each queue card fires a `page_size: 1` count query and
 * reads only `total`; the empty `items` page wrappers carry the schema
 * `__typename` so the default `addTypename` cache is satisfied. `maxUsageCount`
 * absorbs the socket-driven refetches every card subscribes to.
 *
 * The FAQ-submissions card is the exception: it reads a NEW-only list and
 * counts its length, so `submissions` is a row count rather than a total.
 */
interface DashboardCounts {
  sos?: number;
  callbacks?: number;
  tickets?: number;
  chats?: number;
  submissions?: number;
  /** Unique members who watched a Learnings video, summed across videos. */
  learningViews?: number;
}

/** The Learnings views tile reads one stats object (no paging). */
const learningStatsMock = (views: number): MockedResponse => ({
  request: { query: TUTORIAL_STATS },
  result: {
    data: {
      tutorialStats: {
        __typename: 'TutorialStats',
        total_views: views,
        unique_viewers: views,
        published_tutorials: 1,
        total_likes: 0,
        total_comments: 0,
        top_tutorials: [],
      },
    },
  },
  maxUsageCount: 5,
});

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
  faqSubmissionsListMock(
    Array.from({ length: counts.submissions ?? 4 }, (_row, index) =>
      makeFaqSubmission({ id: `sub-${index}` }),
    ),
  ),
  learningStatsMock(counts.learningViews ?? 7),
];
