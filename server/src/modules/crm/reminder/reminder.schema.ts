import gql from 'graphql-tag';

export const reminderTypeDefs = gql`
  enum CrmReminderEntity {
    VENUE_LEAD
    HOST_LEAD
    GENERAL
  }
  enum CrmReminderStatus {
    PENDING
    DONE
  }

  type CrmReminder {
    id: ID!
    entity_type: CrmReminderEntity!
    lead_id: ID
    title: String!
    due_at: String!
    notes: String
    status: CrmReminderStatus!
    assigned_to: String
    created_at: String
    updated_at: String
  }

  input CrmReminderFilter {
    from: String
    to: String
    status: CrmReminderStatus
    entity_type: CrmReminderEntity
    lead_id: ID
  }

  input CreateCrmReminderInput {
    entity_type: CrmReminderEntity
    lead_id: ID
    title: String!
    due_at: String!
    notes: String
    assigned_to: String
  }

  input UpdateCrmReminderInput {
    title: String
    due_at: String
    notes: String
    status: CrmReminderStatus
    assigned_to: String
  }

  extend type Query {
    crmReminders(filter: CrmReminderFilter): [CrmReminder!]!
  }

  extend type Mutation {
    createCrmReminder(input: CreateCrmReminderInput!): CrmReminder!
    updateCrmReminder(id: ID!, input: UpdateCrmReminderInput!): CrmReminder!
    toggleCrmReminderDone(id: ID!): CrmReminder!
    deleteCrmReminder(id: ID!): Boolean!
  }
`;
