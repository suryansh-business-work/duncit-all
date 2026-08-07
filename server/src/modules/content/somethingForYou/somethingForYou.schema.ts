export const somethingForYouTypeDefs = /* GraphQL */ `
  """
  What pressing a card does. Asked rather than inferred: an in-app path and
  a web address look alike to a validator and nothing alike to a person.
  """
  enum SomethingForYouAction {
    NONE
    ROUTE
    URL
  }

  """
  One card in the "Something for you" rail at the bottom of Home. The same row
  renders in mWeb and in the native app, so a promotion changes in one place.
  """
  type SomethingForYouItem {
    id: ID!
    "At most 30 characters — the card is a fixed size on both surfaces."
    title: String!
    image_url: String!
    bottom_text: String!
    action_type: SomethingForYouAction!
    "In-app path, e.g. /referral. Used when action_type is ROUTE."
    link_path: String!
    "An address outside the product. Used when action_type is URL."
    link_url: String!
    sort_order: Int!
    is_active: Boolean!
    created_at: String!
    updated_at: String!
  }

  input SomethingForYouInput {
    title: String!
    image_url: String
    bottom_text: String
    action_type: SomethingForYouAction
    link_path: String
    link_url: String
    sort_order: Int
    is_active: Boolean
  }

  extend type Query {
    "Every card, including the switched-off ones. Admin only."
    somethingForYouItems: [SomethingForYouItem!]!
    "What Home should show: active cards, in the order an admin put them."
    publicSomethingForYou: [SomethingForYouItem!]!
  }

  extend type Mutation {
    createSomethingForYouItem(input: SomethingForYouInput!): SomethingForYouItem!
    updateSomethingForYouItem(item_id: ID!, input: SomethingForYouInput!): SomethingForYouItem!
    deleteSomethingForYouItem(item_id: ID!): Boolean!
  }
`;
