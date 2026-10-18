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
    """
    When the retention sweep deletes this draft: created_at plus the
    admin-configured draft_retention_days. Null when the draft carries no
    usable creation date.
    """
    expires_at: String
  }

  input PodDraftInput {
    payload: String!
    pod_title: String
    pod_mode: String
    step: Int
  }

  """
  "Host again": the Create Pod form filled from one of the caller's own pods.
  Nothing is saved — the draft is created when the host moves on in the form.
  """
  type HostAgainPrefill {
    source_pod_id: ID!
    source_title: String!
    "The stepper's form state as JSON, in the same shape as PodDraft.payload."
    payload: String!
    "The step to open on: the date step when the place carried over, else step 1."
    step: Int!
    """
    What could not be carried over: CLUB_UNAVAILABLE, VENUE_UNAVAILABLE,
    LOCATION_MISSING, CATEGORY_MISSING, PRODUCTS_UNAVAILABLE.
    """
    notices: [String!]!
  }

  extend type Query {
    myPodDrafts: [PodDraft!]!
    myPodDraft(draft_id: ID!): PodDraft
    hostAgainPrefill(pod_doc_id: ID!): HostAgainPrefill!
  }

  extend type Mutation {
    savePodDraft(draft_id: ID, input: PodDraftInput!): PodDraft!
    deletePodDraft(draft_id: ID!): Boolean!
    publishPodDraft(draft_id: ID!, input: CreatePodInput!): Pod!
    """
    "Host again": a new draft holding one of the caller's own pods' content
    (title, description, media, pricing, perks) with no date, slot or attendees,
    ready to open in Create Pod. A cancelled pod can be hosted again too.
    """
    hostAgainPod(pod_doc_id: ID!): PodDraft!
      @deprecated(reason: "Use hostAgainPrefill; the draft is saved when the host moves on.")
  }
`;
