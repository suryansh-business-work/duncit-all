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
  }

  input UpdateCategoryInput {
    name: String
    icon: String
    description: String
    media: [CategoryMediaInput!]
    sort_order: Int
    is_active: Boolean
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
