import { gql, type TypedDocumentNode } from '@apollo/client';
import { LITE_EVENT_CARD_FIELDS, LITE_REGISTRATION_FIELDS, type LiteEventCard, type LiteRegistration } from '../../shared/graphql/documents';

/** What a ticket page needs of its event beyond the card: where to go and where to pay. */
export const LITE_TICKET_EVENT_FIELDS = gql`
  fragment LiteTicketEventFields on LiteEvent {
    ...LiteEventCardFields
    address
    map_url
    virtual_link
    upi_id
    upi_name
    require_approval
  }
  ${LITE_EVENT_CARD_FIELDS}
`;

export interface LiteTicketEvent extends LiteEventCard {
  address: string | null;
  map_url: string | null;
  virtual_link: string | null;
  upi_id: string | null;
  upi_name: string | null;
  require_approval: boolean;
}

export interface LiteTicket extends LiteRegistration {
  event: LiteTicketEvent;
}

export interface LiteRegisterInput {
  ticket_id: string;
  quantity: number;
  answers: { question_id: string; answer: string }[];
}

export const LITE_REGISTER: TypedDocumentNode<{ liteRegister: LiteRegistration }, { event_id: string; input: LiteRegisterInput }> = gql`
  mutation LiteRegister($event_id: ID!, $input: LiteRegisterInput!) {
    liteRegister(event_id: $event_id, input: $input) {
      ...LiteRegistrationFields
    }
  }
  ${LITE_REGISTRATION_FIELDS}
`;

export const LITE_MY_REGISTRATIONS: TypedDocumentNode<{ liteMyRegistrations: LiteTicket[] }, { past?: boolean }> = gql`
  query LiteMyRegistrations($past: Boolean) {
    liteMyRegistrations(past: $past) {
      ...LiteRegistrationFields
      event {
        ...LiteTicketEventFields
      }
    }
  }
  ${LITE_REGISTRATION_FIELDS}
  ${LITE_TICKET_EVENT_FIELDS}
`;

export const LITE_REGISTRATION: TypedDocumentNode<{ liteRegistration: LiteTicket | null }, { id: string }> = gql`
  query LiteRegistration($id: ID!) {
    liteRegistration(id: $id) {
      ...LiteRegistrationFields
      event {
        ...LiteTicketEventFields
      }
    }
  }
  ${LITE_REGISTRATION_FIELDS}
  ${LITE_TICKET_EVENT_FIELDS}
`;

export const LITE_SUBMIT_PAYMENT_REFERENCE: TypedDocumentNode<
  { liteSubmitPaymentReference: LiteRegistration },
  { registration_id: string; reference: string; note?: string | null }
> = gql`
  mutation LiteSubmitPaymentReference($registration_id: ID!, $reference: String!, $note: String) {
    liteSubmitPaymentReference(registration_id: $registration_id, reference: $reference, note: $note) {
      ...LiteRegistrationFields
    }
  }
  ${LITE_REGISTRATION_FIELDS}
`;

export const LITE_CANCEL_REGISTRATION: TypedDocumentNode<{ liteCancelRegistration: LiteRegistration }, { id: string }> = gql`
  mutation LiteCancelRegistration($id: ID!) {
    liteCancelRegistration(id: $id) {
      ...LiteRegistrationFields
    }
  }
  ${LITE_REGISTRATION_FIELDS}
`;

export interface LiteUpiQr {
  data_url: string;
  upi_link: string;
}

export const LITE_UPI_QR: TypedDocumentNode<{ liteUpiQr: LiteUpiQr }, { upi_id: string; name?: string | null; amount?: number | null; note?: string | null }> = gql`
  query LiteUpiQr($upi_id: String!, $name: String, $amount: Int, $note: String) {
    liteUpiQr(upi_id: $upi_id, name: $name, amount: $amount, note: $note) {
      data_url
      upi_link
    }
  }
`;
