import { gql } from '@/generated/graphql';

/**
 * The portal's Reminders calendar on the phone: editing and deleting a
 * reminder (the same mutations as the portal's dialog and drawer), and the
 * venue and host leads' next follow-ups the calendar shows beside reminders —
 * only the three fields it reads.
 */
export const CrmAppUpdateReminderDocument = gql(`
  mutation CrmAppUpdateReminder($id: ID!, $input: UpdateCrmReminderInput!) {
    updateCrmReminder(id: $id, input: $input) { id title due_at notes status }
  }
`);

export const CrmAppDeleteReminderDocument = gql(`
  mutation CrmAppDeleteReminder($id: ID!) {
    deleteCrmReminder(id: $id)
  }
`);

export const CrmAppCalendarFollowUpsDocument = gql(`
  query CrmAppCalendarFollowUps {
    venueLeads(filter: {}) { id venue_name next_follow_up_date }
    hostLeads(filter: {}) { id host_name next_follow_up_date }
  }
`);
