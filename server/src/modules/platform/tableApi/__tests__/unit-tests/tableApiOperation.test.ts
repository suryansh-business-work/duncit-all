import { parse, print } from 'graphql';
import { createTableOperations, isTextArg } from '../../tableApi.operation';

const SDL = /* GraphQL */ `
  type Query {
    plainTable(query: TableQueryInput, status: Status, name: String, id: ID, n: Int, ids: [ID!]): PlainPage!
    bareTable: BarePage
    notATableThing: PlainPage
    scalarTable: Int
    noRowsTable: NoRows
    noTotalTable: NoTotal
    leafRowsTable: LeafRows
  }
  input TableQueryInput {
    page: Int
  }
  enum Status {
    LIVE
  }
  type PlainPage {
    rows: [Row!]!
    total: Int!
    page: Int
    page_size: Int
  }
  type BarePage {
    rows: [Row]
    total: Int
    page_size: Meta
  }
  type NoRows {
    total: Int
  }
  type NoTotal {
    rows: [Row]
  }
  type LeafRows {
    rows: [String]
    total: Int
  }
  type Row {
    id: ID!
    status: Status
    count(limit: Int!): Int
    since(days: Int! = 5): Int
    tags(first: Int): [String]
    address: Address
    owner: Owner
    thing: Thing
    empty: Empty
  }
  type Address {
    city: String
    geo: Geo
  }
  type Geo {
    lat: Float
    deeper: Deeper
  }
  type Deeper {
    x: Int
  }
  type Owner {
    name: String
  }
  union Thing = Owner | Address
  type Empty {
    n(required: Int!): Int
  }
  type Meta {
    a: Int
  }
`;

const RESOLVERS = [{ Query: {} }, { Row: { owner: () => null } }];

const operationsFor = () =>
  createTableOperations([SDL, parse('extend type Query { extraTable: BarePage }')], RESOLVERS);

describe('createTableOperations', () => {
  it('selects every plain row field, follows embedded objects a few levels, and keeps the page leaves', () => {
    const op = operationsFor().get('plainTable');
    expect(op?.operationName).toBe('TableApi_plainTable');
    const text = print(op!.document).replaceAll(/\s+/g, ' ');
    expect(text).toContain(
      'query TableApi_plainTable($query: TableQueryInput, $status: Status, $name: String, $id: ID, $n: Int, $ids: [ID!])'
    );
    // graphql's printer breaks an argument list longer than 80 columns onto
    // one line per argument, which the whitespace collapse above flattens.
    expect(text).toContain('plainTable( query: $query status: $status name: $name id: $id n: $n ids: $ids )');
    expect(text).toContain('rows { id status since tags address { city geo { lat } } }');
    expect(text).toContain('total page page_size');
    expect(text).not.toMatch(/count|owner|thing|empty|deeper/);
  });

  it('builds an argument-less table and skips page fields that are not leaves', () => {
    const text = print(operationsFor().get('bareTable')!.document).replaceAll(/\s+/g, ' ');
    expect(text).toContain('query TableApi_bareTable { bareTable { rows {');
    expect(text).toContain('} total } }');
    expect(text).not.toContain('page_size');
  });

  it('reads SDL given as parsed documents too', () => {
    expect(operationsFor().get('extraTable')).not.toBeNull();
  });

  it.each(['missingTable', 'notATableThing', 'scalarTable', 'noRowsTable', 'noTotalTable', 'leafRowsTable'])(
    'refuses %s, which is not a table query',
    (name) => {
      const operations = operationsFor();
      expect(operations.get(name)).toBeNull();
      expect(operations.get(name)).toBeNull();
    }
  );

  it('builds each operation once', () => {
    const operations = operationsFor();
    expect(operations.get('plainTable')).toBe(operations.get('plainTable'));
  });

  it('answers null for a schema with no Query type', () => {
    expect(createTableOperations(['type Lonely { a: Int }'], []).get('lonelyTable')).toBeNull();
  });
});

describe('isTextArg', () => {
  const field = operationsFor().get('plainTable')!.field;

  it.each([
    ['status', true],
    ['name', true],
    ['id', true],
    ['n', false],
    ['ids', false],
    ['query', false],
    ['absent', true],
  ])('%s is text: %s', (name, expected) => {
    expect(isTextArg(field, name)).toBe(expected);
  });
});
