import { gql } from '@apollo/client';

export interface Subscriber {
  id: string;
  email: string;
  source: string;
  unsubscribed_at: string | null;
  created_at: string;
}

export const NEWSLETTER_SUBSCRIBERS = gql`
  query NewsletterSubscribers {
    newsletterSubscribers {
      id
      email
      source
      unsubscribed_at
      created_at
    }
  }
`;

/** NewsletterSource enum values (server newsletter.schema.ts) for the Source filter. */
export const NEWSLETTER_SOURCES = ['WEBSITE_FOOTER', 'WEBSITE_PAGE', 'MWEB', 'ADMIN', 'OTHER'] as const;

export const NEWSLETTER_TABLE = gql`
  query NewsletterSubscribersTable($query: TableQueryInput) {
    newsletterSubscribersTable(query: $query) {
      total
      rows {
        id
        email
        source
        unsubscribed_at
        created_at
      }
    }
  }
`;
