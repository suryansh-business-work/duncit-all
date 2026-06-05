import { gql } from '@apollo/client';

export type ReminderEntity = 'VENUE_LEAD' | 'HOST_LEAD' | 'GENERAL';
export type ReminderStatus = 'PENDING' | 'DONE';

export interface CrmReminder {
  id: string;
  entity_type: ReminderEntity;
  lead_id: string | null;
  title: string;
  due_at: string;
  notes: string | null;
  status: ReminderStatus;
  assigned_to: string | null;
}

const FIELDS = `id entity_type lead_id title due_at notes status assigned_to`;

export const CRM_REMINDERS = gql`
  query CrmReminders($filter: CrmReminderFilter) {
    crmReminders(filter: $filter) { ${FIELDS} }
  }
`;

export const CREATE_CRM_REMINDER = gql`
  mutation CreateCrmReminder($input: CreateCrmReminderInput!) {
    createCrmReminder(input: $input) { ${FIELDS} }
  }
`;

export const UPDATE_CRM_REMINDER = gql`
  mutation UpdateCrmReminder($id: ID!, $input: UpdateCrmReminderInput!) {
    updateCrmReminder(id: $id, input: $input) { ${FIELDS} }
  }
`;

export const TOGGLE_CRM_REMINDER = gql`
  mutation ToggleCrmReminderDone($id: ID!) {
    toggleCrmReminderDone(id: $id) { ${FIELDS} }
  }
`;

export const DELETE_CRM_REMINDER = gql`
  mutation DeleteCrmReminder($id: ID!) {
    deleteCrmReminder(id: $id)
  }
`;
