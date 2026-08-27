import type { MockedResponse } from '@apollo/client/testing';
import { websiteContentListMock, makeContentItem } from './content.mock';
import { newsletterSubscribersListMock, makeSubscriber } from './newsletter.mock';
import { contactSubmissionsListMock, makeContactSubmission } from './contact.mock';

/**
 * The dashboard aggregates three lists into KPI counts. This snapshot yields:
 * content 1 Career / 1 Newsroom / 2 Blog, 2 subscribers (1 active) and 2
 * contacts (1 new) — every object typed via the shared entity factories.
 */
export const dashboardMocks = (): MockedResponse[] => [
  websiteContentListMock([
    makeContentItem({ id: '1', type: 'CAREERS' }),
    makeContentItem({ id: '2', type: 'NEWSROOM' }),
    makeContentItem({ id: '3', type: 'BLOG' }),
    makeContentItem({ id: '4', type: 'BLOG' }),
  ]),
  newsletterSubscribersListMock([
    makeSubscriber({ id: 's1', unsubscribed_at: null }),
    makeSubscriber({ id: 's2', unsubscribed_at: '2026-01-01T00:00:00.000Z' }),
  ]),
  contactSubmissionsListMock([
    makeContactSubmission({ id: 'c1', status: 'NEW' }),
    makeContactSubmission({ id: 'c2', status: 'RESOLVED' }),
  ]),
];

/** All three lists empty — drives the `?? []` fallbacks to zero counts with no unmatched-query noise. */
export const dashboardEmptyMocks = (): MockedResponse[] => [
  websiteContentListMock([]),
  newsletterSubscribersListMock([]),
  contactSubmissionsListMock([]),
];
