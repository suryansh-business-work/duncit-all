import { gql, type TypedDocumentNode } from '@apollo/client';

/** The API's ticket categories; the store's form offers the four a shopper can tell apart. */
export type SupportTicketCategory = 'GENERAL' | 'PAYMENT' | 'BOOKING' | 'SAFETY' | 'TECHNICAL' | 'OTHER';

export interface StoreSupportTicketInput {
  name: string;
  email: string;
  phone?: string | null;
  subject: string;
  category?: SupportTicketCategory | null;
  message: string;
  /** The order it is about, when there is one. */
  order_no?: string | null;
}

export const SUPPORT_TICKET: TypedDocumentNode<
  { storeCreateSupportTicket: { ticket_no: string } },
  { input: StoreSupportTicketInput }
> = gql`
  mutation EcommStoreCreateSupportTicket($input: StoreSupportTicketInput!) {
    storeCreateSupportTicket(input: $input) {
      ticket_no
    }
  }
`;
