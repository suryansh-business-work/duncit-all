export const inventoryTypeDefs = /* GraphQL */ `
  type InventoryProduct {
    id: ID!
    product_name: String!
    sku: String!
    description: String!
    image_url: String!
    unit_cost: Float!
    inventory_count: Int!
    requested_count: Int!
    available_count: Int!
    is_active: Boolean!
    created_at: String!
    updated_at: String!
  }

  input InventoryProductInput {
    product_name: String!
    sku: String!
    description: String
    image_url: String
    unit_cost: Float!
    inventory_count: Int!
    is_active: Boolean
  }

  input UpdateInventoryProductInput {
    product_name: String
    sku: String
    description: String
    image_url: String
    unit_cost: Float
    inventory_count: Int
    is_active: Boolean
  }

  extend type Query {
    inventoryProducts(search: String, activeOnly: Boolean): [InventoryProduct!]!
    inventoryProduct(product_doc_id: ID!): InventoryProduct
  }

  extend type Mutation {
    createInventoryProduct(input: InventoryProductInput!): InventoryProduct!
    updateInventoryProduct(product_doc_id: ID!, input: UpdateInventoryProductInput!): InventoryProduct!
    deleteInventoryProduct(product_doc_id: ID!): Boolean!
  }
`;