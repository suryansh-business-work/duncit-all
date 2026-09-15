export const tableApiTypeDefs = /* GraphQL */ `
  """
  The signed-in person's access to the table GET API. A URL carrying the token
  runs as its owner, so it returns only rows that person can already see.
  """
  type TableApiAccess {
    "Null until generated. Treat it as a password."
    token: String
    "e.g. https://server.duncit.com/table-api — append /<tableQueryName>."
    base_url: String!
    created_at: String
    last_used_at: String
  }

  extend type Query {
    myTableApiAccess: TableApiAccess!
  }

  extend type Mutation {
    "Issues a new token; every URL built from the previous one stops working."
    rotateMyTableApiToken: TableApiAccess!
    revokeMyTableApiToken: TableApiAccess!
  }
`;
