import { gql } from '@/generated/graphql';

export const CrmAppRemindersDocument = gql(`
  query CrmAppReminders($filter: CrmReminderFilter) {
    crmReminders(filter: $filter) { id entity_type lead_id title due_at notes status }
  }
`);

export const CrmAppCreateReminderDocument = gql(`
  mutation CrmAppCreateReminder($input: CreateCrmReminderInput!) {
    createCrmReminder(input: $input) { id entity_type lead_id title due_at notes status }
  }
`);

export const CrmAppToggleReminderDocument = gql(`
  mutation CrmAppToggleReminder($id: ID!) {
    toggleCrmReminderDone(id: $id) { id status }
  }
`);
