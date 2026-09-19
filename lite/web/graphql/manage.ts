import { gql, type TypedDocumentNode } from '@apollo/client';
import { LITE_EVENT_FIELDS, LITE_REGISTRATION_FIELDS, type LiteEvent, type LiteRegistration, type LiteRegistrationStatus } from '../../shared/graphql/documents';
import type { LiteRegistrationAction } from './types';

export const LITE_EVENT_REGISTRATIONS: TypedDocumentNode<
  { liteEventRegistrations: LiteRegistration[] },
  { event_id: string; status?: LiteRegistrationStatus | null; search?: string | null }
> = gql`
  query LiteEventRegistrations($event_id: ID!, $status: LiteRegistrationStatus, $search: String) {
    liteEventRegistrations(event_id: $event_id, status: $status, search: $search) {
      ...LiteRegistrationFields
    }
  }
  ${LITE_REGISTRATION_FIELDS}
`;

export const LITE_HOST_REGISTRATION_ACTION: TypedDocumentNode<
  { liteHostRegistrationAction: LiteRegistration },
  { id: string; action: LiteRegistrationAction }
> = gql`
  mutation LiteHostRegistrationAction($id: ID!, $action: LiteRegistrationAction!) {
    liteHostRegistrationAction(id: $id, action: $action) {
      ...LiteRegistrationFields
    }
  }
  ${LITE_REGISTRATION_FIELDS}
`;

export const LITE_HOST_CHECK_IN_BY_CODE: TypedDocumentNode<{ liteHostCheckInByCode: LiteRegistration }, { event_id: string; code: string }> = gql`
  mutation LiteHostCheckInByCode($event_id: ID!, $code: String!) {
    liteHostCheckInByCode(event_id: $event_id, code: $code) {
      ...LiteRegistrationFields
    }
  }
  ${LITE_REGISTRATION_FIELDS}
`;

export const LITE_SEND_EVENT_UPDATE: TypedDocumentNode<{ liteSendEventUpdate: { sent: number } }, { event_id: string; subject: string; body: string }> = gql`
  mutation LiteSendEventUpdate($event_id: ID!, $subject: String!, $body: String!) {
    liteSendEventUpdate(event_id: $event_id, subject: $subject, body: $body) {
      sent
    }
  }
`;

export const LITE_ADD_CO_HOST: TypedDocumentNode<{ liteAddCoHost: LiteEvent }, { event_id: string; email: string }> = gql`
  mutation LiteAddCoHost($event_id: ID!, $email: String!) {
    liteAddCoHost(event_id: $event_id, email: $email) {
      ...LiteEventFields
    }
  }
  ${LITE_EVENT_FIELDS}
`;

export const LITE_REMOVE_CO_HOST: TypedDocumentNode<{ liteRemoveCoHost: LiteEvent }, { event_id: string; user_id: string }> = gql`
  mutation LiteRemoveCoHost($event_id: ID!, $user_id: ID!) {
    liteRemoveCoHost(event_id: $event_id, user_id: $user_id) {
      ...LiteEventFields
    }
  }
  ${LITE_EVENT_FIELDS}
`;
