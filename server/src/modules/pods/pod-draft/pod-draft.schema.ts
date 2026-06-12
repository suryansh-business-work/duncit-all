import gql from 'graphql-tag';

export const podDraftTypeDefs = gql`
  type PodDraft {
    id: ID!
    pod_title: String!
    pod_mode: String!
    step: Int!
    payload: String!
    created_at: String
    updated_at: String
  }

  input PodDraftInput {
    payload: String!
    pod_title: String
    pod_mode: String
    step: Int
  }

  extend type Query {
    myPodDrafts: [PodDraft!]!
    myPodDraft(draft_id: ID!): PodDraft
  }

  extend type Mutation {
    savePodDraft(draft_id: ID, input: PodDraftInput!): PodDraft!
    deletePodDraft(draft_id: ID!): Boolean!
    publishPodDraft(draft_id: ID!, input: CreatePodInput!): Pod!
  }
`;
