export const expenseOptionTypeDefs = /* GraphQL */ `
  """
  One row of one Expense dropdown, edited from Finance > Settings > Expense
  Settings. The four lists are told apart by 'kind': RELATED_FROM_TYPE,
  CATEGORY, PAYMENT_METHOD, COMPENSATION_METHOD.
  """
  type ExpenseOption {
    id: ID!
    kind: String!
    "CONSTANT_CASE code an expense stores. Never changes after creation."
    key: String!
    "What a person reads. Editable without touching a single stored expense."
    label: String!
    "RELATED_FROM_TYPE only: which entity list its picker searches."
    entity_source: String!
    sort_order: Int!
    is_active: Boolean!
    "Seeded by the platform: rewordable and switchable, never deletable."
    is_system: Boolean!
    """
    How many expenses point at this option — only ever 0 for a deletable row.

    Counted for the SETTINGS read and null for the form dropdown, which asks a
    different question and should not pay for four count queries to answer it.
    """
    usage_count: Int
    created_at: String!
    updated_at: String!
  }

  "One thing an expense can be attributed to, as the picker shows it."
  type ExpenseRelatedEntity {
    id: ID!
    name: String!
    "The human reference beside the name — a pod slug, VEN-000001, CADM-000001."
    reference: String!
  }

  input ExpenseOptionInput {
    "Required on create, ignored on update — the key is what expenses store."
    key: String
    label: String
    "RELATED_FROM_TYPE only; an unknown source name is dropped."
    entity_source: String
    sort_order: Int
    is_active: Boolean
  }

  extend type Query {
    "The dropdown the Expense form renders: active rows of one list, in order."
    expenseOptions(kind: String!): [ExpenseOption!]!
    "The settings table: one whole list, switched-off rows and usage included."
    expenseOptionsTable(kind: String!): [ExpenseOption!]!
    "Every entity source a RELATED_FROM_TYPE may point at."
    expenseEntitySources: [String!]!
    "Searchable entity list for one Related From type."
    expenseRelatedEntities(
      type_key: String!
      search: String
      limit: Int
    ): [ExpenseRelatedEntity!]!
    "One entity by id — how a saved expense re-reads the name it was filed against."
    expenseRelatedEntity(type_key: String!, entity_id: ID!): ExpenseRelatedEntity
  }

  extend type Mutation {
    createExpenseOption(kind: String!, input: ExpenseOptionInput!): ExpenseOption!
    updateExpenseOption(option_id: ID!, input: ExpenseOptionInput!): ExpenseOption!
    "Refused for a built-in option, and for any option an expense still uses."
    deleteExpenseOption(option_id: ID!): Boolean!
  }
`;
