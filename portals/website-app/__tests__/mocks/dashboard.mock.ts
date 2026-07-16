import type { MockedResponse } from '@apollo/client/testing';
import { websiteContentListMock, makeContentItem } from './content.mock';
import { newsletterSubscribersListMock, makeSubscriber } from './newsletter.mock';
import { contactSubmissionsListMock, makeContactSubmission } from './contact.mock';
import { faqSubmissionsListMock, makeFaqSubmission } from './faq.mock';

/**
 * The dashboard aggregates four lists into KPI counts. This snapshot yields:
 * content 1 Career / 1 Newsroom / 2 Blog, 2 subscribers (1 active), 2 contacts
 * (1 new), 2 FAQs (1 new) — every object typed via the shared entity factories.
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
  faqSubmissionsListMock([
    makeFaqSubmission({ id: 'f1', status: 'NEW' }),
    makeFaqSubmission({ id: 'f2', status: 'IGNORED' }),
  ]),
];

/** All four lists empty — drives the `?? []` fallbacks to zero counts with no unmatched-query noise. */
export const dashboardEmptyMocks = (): MockedResponse[] => [
  websiteContentListMock([]),
  newsletterSubscribersListMock([]),
  contactSubmissionsListMock([]),
  faqSubmissionsListMock([]),
];
