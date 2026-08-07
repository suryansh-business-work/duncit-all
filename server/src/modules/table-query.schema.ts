/**
 * Shared SDL for the common table epic (DUNCIT TABLE CONTRACT v1).
 * Registered ONCE in src/modules/index.ts; per-entity `<entity>Table` queries
 * reference these types from their own module schemas.
 */
export const tableQueryTypeDefs = /* GraphQL */ `
  enum TableSortDir {
    asc
    desc
  }

  enum TableFilterOp {
    eq
    ne
    in
    contains
    gte
    lte
    between
    is_true
    is_false
  }

  input TableFilterInput {
    field: String!
    op: TableFilterOp!
    value: String
    values: [String!]
  }

  input TableQueryInput {
    search: String
    page: Int
    page_size: Int
    sort_by: String
    sort_dir: TableSortDir
    filters: [TableFilterInput!]
  }

  """
  What a one-time entity-id repair did.

  Every entity whose id is minted on insert (contracts, documents, policies …)
  needs the same one-off pass for rows written before that id existed, and each
  one answers the same single question: how many did it have to fix.
  """
  type EntityIdBackfillResult {
    repaired: Int!
  }
`;
