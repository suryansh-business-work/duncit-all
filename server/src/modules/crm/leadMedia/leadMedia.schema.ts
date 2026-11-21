import gql from 'graphql-tag';

/** Lead Details › Logos & Images — uploaded logos and images on any CRM lead. */
export const leadMediaTypeDefs = gql`
  enum CrmLeadMediaKind {
    LOGO
    IMAGE
  }

  "A logo or image uploaded to a CRM lead (any of the five lead kinds)."
  type CrmLeadMedia {
    id: ID!
    entity_type: CrmEntityType!
    lead_id: ID!
    kind: CrmLeadMediaKind!
    url: String!
    name: String!
    mime_type: String!
    size_bytes: Int
    width: Int
    height: Int
    sort_order: Int!
    uploaded_by: String
    created_at: String
    updated_at: String
  }

  input CrmLeadMediaInput {
    kind: CrmLeadMediaKind!
    url: String!
    name: String
    mime_type: String
    size_bytes: Int
    width: Int
    height: Int
  }

  "Rename, re-file or replace an item. Send url (with its file fields) only to replace the file."
  input CrmLeadMediaUpdateInput {
    kind: CrmLeadMediaKind
    name: String
    url: String
    mime_type: String
    size_bytes: Int
    width: Int
    height: Int
  }

  extend type Query {
    "Every logo and image of one lead: logos first, each kind in its upload order."
    crmLeadMedia(entity_type: CrmEntityType!, lead_id: ID!): [CrmLeadMedia!]!
  }

  extend type Mutation {
    "Attach uploaded files to a lead. Returns the lead's whole list."
    addCrmLeadMedia(entity_type: CrmEntityType!, lead_id: ID!, items: [CrmLeadMediaInput!]!): [CrmLeadMedia!]!
    updateCrmLeadMedia(id: ID!, input: CrmLeadMediaUpdateInput!): CrmLeadMedia!
    deleteCrmLeadMedia(id: ID!): Boolean!
  }
`;
