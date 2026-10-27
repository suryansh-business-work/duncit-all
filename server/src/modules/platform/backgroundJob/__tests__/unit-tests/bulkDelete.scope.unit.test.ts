/**
 * The read that captures what a table shows its caller: built from the live
 * schema for a `<name>Table` query only, once per name, and null for anything
 * that is not one — including a name the schema has no such query for.
 */
import { buildSchema, print, type GraphQLSchema } from 'graphql';

const mockSchema: { current: GraphQLSchema | null } = { current: null };

jest.mock('@modules/platform/graphqlMonitor/graphqlMonitor.plugin', () => ({
  currentSchema: () => mockSchema.current,
}));

import { tableScopeDocument } from '../../bulkDelete.operations';

const SDL = /* GraphQL */ `
  input TableQueryInput {
    page: Int
  }
  type Row {
    id: ID!
  }
  type RowPage {
    rows: [Row!]!
    total: Int!
  }
  type Query {
    leadsTable(city: String!, query: TableQueryInput): RowPage!
    brokenTable: [Row!]!
    notATableQuery: RowPage!
  }
`;

beforeEach(() => {
  mockSchema.current = buildSchema(SDL);
});

describe('tableScopeDocument', () => {
  it('asks the table for its total only, with the table’s own arguments', () => {
    const document = tableScopeDocument('leadsTable');
    expect(document).not.toBeNull();
    const text = print(document!);
    expect(text).toContain('leadsTable');
    expect(text).toContain('total');
    expect(text).not.toContain('rows');
  });

  it('builds it once and hands back the same document afterwards', () => {
    expect(tableScopeDocument('leadsTable')).toBe(tableScopeDocument('leadsTable'));
  });

  it('is null for a name that is not a table query, before Apollo has a schema, and for a table the schema does not have', () => {
    expect(tableScopeDocument('notATableQuery')).toBeNull();
    mockSchema.current = null;
    expect(tableScopeDocument('anyTable')).toBeNull();
    mockSchema.current = buildSchema(SDL);
    expect(tableScopeDocument('missingTable')).toBeNull();
    expect(tableScopeDocument('missingTable')).toBeNull();
  });

  it('is null for a table whose page carries no total, rather than a document that cannot run', () => {
    expect(tableScopeDocument('brokenTable')).toBeNull();
  });
});
