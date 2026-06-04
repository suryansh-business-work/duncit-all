import { gql } from '@/generated/graphql';

/** The user's support tickets for the Tickets list. */
export const MyTicketsDocument = gql(`
  query MobileMyTickets {
    myTickets {
      id
      subject
      category
      status
      priority
      message_count
      last_message_at
      created_at
    }
  }
`);

/** Opens a new support ticket. */
export const CreateTicketDocument = gql(`
  mutation MobileCreateTicket($input: CreateTicketInput!) {
    createTicket(input: $input) {
      id
      subject
      status
      category
    }
  }
`);
