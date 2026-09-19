import { gql } from '@apollo/client';
import type { LitePaymentStatus, LiteRegistrationStatus } from '../../shared/graphql/documents';

/** What the read-only Registrations grid shows per row. */
export interface LiteAdminRegistrationRow {
  id: string;
  code: string;
  quantity: number;
  amount_due: number;
  status: LiteRegistrationStatus;
  payment_status: LitePaymentStatus;
  payment_reference: string | null;
  created_at: string;
  ticket: { id: string; name: string; price: number };
  user: { id: string; name: string; email: string; handle: string };
  event: { id: string; slug: string; title: string; start_at: string };
}

export const LITE_ADMIN_REGISTRATIONS_TABLE = gql`
  query LiteAdminRegistrationsTable($query: TableQueryInput) {
    liteAdminRegistrationsTable(query: $query) {
      rows {
        id
        code
        quantity
        amount_due
        status
        payment_status
        payment_reference
        created_at
        ticket {
          id
          name
          price
        }
        user {
          id
          name
          email
          handle
        }
        event {
          id
          slug
          title
          start_at
        }
      }
      total
      page
      page_size
    }
  }
`;
