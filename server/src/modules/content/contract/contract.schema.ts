export const contractTypeDefs = /* GraphQL */ `
  "Where a contract is in its life."
  enum ContractStatus {
    DRAFT
    ACTIVE
    EXPIRED
    ARCHIVED
  }

  type Contract {
    id: ID!
    """
    The permanent, globally unique handle (CTR-000001). Minted on creation,
    never edited, and never reused — the counter behind it only counts up, so
    a deleted contract's id is not handed to another one.
    """
    contract_no: String!
    title: String!
    description: String!
    content: String!
    status: ContractStatus!
    counterparty: String!
    effective_from: String
    effective_to: String
    created_by_name: String!
    updated_by_name: String!
    created_at: String!
    updated_at: String!
  }

  "Server-side table page for the shared table engine (contractsTable)."
  type ContractTablePage {
    rows: [Contract!]!
    total: Int!
    page: Int!
    page_size: Int!
  }

  input CreateContractInput {
    title: String!
    description: String
    content: String
    status: ContractStatus
    counterparty: String
    effective_from: String
    effective_to: String
  }

  input UpdateContractInput {
    title: String
    description: String
    content: String
    status: ContractStatus
    counterparty: String
    effective_from: String
    effective_to: String
  }

  type ContractBackfillResult {
    repaired: Int!
  }

  extend type Query {
    contractsTable(query: TableQueryInput): ContractTablePage!
    contract(id: ID!): Contract
  }

  extend type Mutation {
    createContract(input: CreateContractInput!): Contract!
    updateContract(id: ID!, input: UpdateContractInput!): Contract!
    "Shorthand for setting the status to ARCHIVED."
    archiveContract(id: ID!): Contract!
    deleteContract(id: ID!): Boolean!
    "One-time repair: give an id to any contract that has none."
    backfillContractIds: ContractBackfillResult!
  }
`;
