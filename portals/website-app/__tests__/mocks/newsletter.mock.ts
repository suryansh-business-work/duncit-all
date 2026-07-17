import type { MockedResponse } from '@apollo/client/testing';
import type { NewsletterSubscriber } from '@duncit/gql-types';
import {
  NEWSLETTER_SUBSCRIBERS,
  NEWSLETTER_TABLE,
} from '../../src/pages/website/newsletter/queries';
import { tablePageMock } from './table';

/**
 * Newsletter subscriber projection: a schema-synced `Pick` of the generated
 * `NewsletterSubscriber` with the nullable `unsubscribed_at` narrowed to the
 * app's `string | null`, plus the cache `__typename`.
 */
export type SubscriberMock = Pick<NewsletterSubscriber, 'id' | 'email' | 'source' | 'created_at'> & {
  __typename: 'NewsletterSubscriber';
  unsubscribed_at: string | null;
};

export const makeSubscriber = (over: Partial<SubscriberMock> = {}): SubscriberMock => ({
  __typename: 'NewsletterSubscriber',
  id: 's1',
  email: 'a@duncit.com',
  source: 'WEBSITE_FOOTER',
  unsubscribed_at: null,
  created_at: '2026-01-01T00:00:00.000Z',
  ...over,
});

export const newsletterSubscribersTableMock = (
  rows: SubscriberMock[] = [makeSubscriber()],
): MockedResponse =>
  tablePageMock(
    NEWSLETTER_TABLE,
    'newsletterSubscribersTable',
    'NewsletterSubscriberTablePage',
    rows,
  );

/** Full list query (KPI totals on the newsletter page + dashboard). */
export const newsletterSubscribersListMock = (rows: SubscriberMock[] = []): MockedResponse => ({
  request: { query: NEWSLETTER_SUBSCRIBERS },
  variableMatcher: () => true,
  maxUsageCount: Number.POSITIVE_INFINITY,
  result: { data: { newsletterSubscribers: rows } },
});
