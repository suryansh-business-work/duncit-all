export const categoryTypeDefs = /* GraphQL */ `
  enum CategoryLevel {
    SUPER
    CATEGORY
    SUB
  }

  enum CategoryMediaType {
    IMAGE
    VIDEO
  }

  type CategoryMedia {
    url: String!
    type: CategoryMediaType!
  }

  input CategoryMediaInput {
    url: String!
    type: CategoryMediaType
  }

  "Icon placement relative to the category label in the home vibe tabber."
  enum CategoryIconPosition {
    TOP
    BOTTOM
    LEFT
    RIGHT
  }

  "CATEGORY level only: per-surface icon placement + size for the vibe tabber."
  type CategoryIconLayout {
    position: CategoryIconPosition!
    width: Int!
    height: Int!
  }

  input CategoryIconLayoutInput {
    position: CategoryIconPosition
    width: Int
    height: Int
  }

  type Category {
    id: ID!
    name: String!
    slug: String!
    icon: String
    description: String
    media: [CategoryMedia!]!
    level: CategoryLevel!
    parent_id: ID
    is_active: Boolean!
    is_system: Boolean!
    sort_order: Int!
    "SUB level only: may a host invite co-hosts to a pod in this sub-category?"
    allow_co_hosts: Boolean!
    "SUB level only: how many co-hosts one pod may carry (1-5)."
    max_co_hosts: Int!
    "CATEGORY level only: icon layout for the mWeb vibe tabber."
    icon_layout_mweb: CategoryIconLayout
    "CATEGORY level only: icon layout for the native-app vibe tabber."
    icon_layout_native: CategoryIconLayout
    created_at: String!
    updated_at: String!
  }

  input CategoryFilterInput {
    level: CategoryLevel
    parent_id: ID
    search: String
  }

  input CreateCategoryInput {
    name: String!
    level: CategoryLevel!
    parent_id: ID
    icon: String
    description: String
    media: [CategoryMediaInput!]
    sort_order: Int
    allow_co_hosts: Boolean
    max_co_hosts: Int
    icon_layout_mweb: CategoryIconLayoutInput
    icon_layout_native: CategoryIconLayoutInput
  }

  input UpdateCategoryInput {
    name: String
    icon: String
    description: String
    media: [CategoryMediaInput!]
    sort_order: Int
    is_active: Boolean
    allow_co_hosts: Boolean
    max_co_hosts: Int
    icon_layout_mweb: CategoryIconLayoutInput
    icon_layout_native: CategoryIconLayoutInput
  }

  extend type Query {
    categories(filter: CategoryFilterInput): [Category!]!
    category(category_id: ID!): Category
    categoryTree: [Category!]!
  }

  extend type Mutation {
    createCategory(input: CreateCategoryInput!): Category!
    updateCategory(category_id: ID!, input: UpdateCategoryInput!): Category!
    deleteCategory(category_id: ID!): Boolean!
  }
`;
