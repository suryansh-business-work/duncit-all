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
