import { Kind, buildSchema, parse, type DocumentNode, type OperationDefinitionNode } from 'graphql';
import { ANONYMOUS_NAME, INVALID_OPERATION, describeOperation, opKeyOf } from '../../graphqlMonitor.signature';

const schema = buildSchema(`
  type Query { me: User, users(limit: Int, filter: Filter): [User!]!, ping: String, byIds(ids: [Int!]): [User!]! }
  type Mutation { rename(name: String!): User }
  type User { id: ID!, name: String, friends: [User!]! }
  input Filter { name: String }
`);

let counter = 0;
const hash = () => `hash-${counter++}`;

function describe_(query: string, opts: { hash?: string; withSchema?: boolean; operationName?: string } = {}) {
  const document: DocumentNode = parse(query);
  const operations = document.definitions.filter((d): d is OperationDefinitionNode => d.kind === Kind.OPERATION_DEFINITION);
  const operation = opts.operationName ? operations.find((o) => o.name?.value === opts.operationName)! : operations[0];
  return describeOperation(opts.hash ?? hash(), document, operation, opts.withSchema === false ? null : schema);
}

describe('describeOperation', () => {
  it('describes a named query: type, root fields and Type.field coordinates', () => {
    const shape = describe_('query Q { me { id name friends { id } } ping }');
    expect(shape.name).toBe('Q');
    expect(shape.type).toBe('QUERY');
    expect(shape.root_fields).toEqual(['me', 'ping']);
    expect(shape.fields).toEqual(['Query.me', 'User.id', 'User.name', 'User.friends', 'Query.ping']);
    expect(shape.op_key).toBe(opKeyOf(shape.signature));
    expect(shape.op_key).toHaveLength(20);
  });

  it('names an anonymous operation and upper-cases a mutation type', () => {
    const shape = describe_('mutation { rename(name: "x") { id } }');
    expect(shape).toMatchObject({ name: ANONYMOUS_NAME, type: 'MUTATION', root_fields: ['rename'] });
  });

  it('blanks literals so two inlined values share one signature and key', () => {
    const a = describe_('query Q { users(limit: 10, filter: { name: "a" }) { id } }');
    const b = describe_('query Q { users(limit: 99, filter: { name: "b" }) { id } }');
    const c = describe_('query Q { users(limit: 1.5) { id name } }');
    expect(a.signature).toBe(b.signature);
    expect(a.op_key).toBe(b.op_key);
    expect(c.op_key).not.toBe(a.op_key);
    expect(a.signature).not.toContain('"a"');
    expect(a.signature).toContain('limit:0');
    expect(c.signature).toContain('limit:0');
  });

  it('blanks string and list literals', () => {
    const shape = describe_('mutation M { rename(name: "secret") { id } }');
    expect(shape.signature).not.toContain('secret');
    const list = describe_('query L { byIds(ids: [1, 2, 3]) { id } }');
    expect(list.signature).toBe('query L{byIds(ids:[]){id}}');
  });

  it('puts the used fragments after the operation in name order', () => {
    const shape = describe_(
      'query Q { me { ...Zed ...Alpha } } fragment Zed on User { name } fragment Alpha on User { id }'
    );
    expect(shape.signature.indexOf('fragment Alpha')).toBeLessThan(shape.signature.indexOf('fragment Zed'));
    expect(shape.signature.startsWith('query Q')).toBe(true);
  });

  it('only describes the executed operation of a multi-operation document', () => {
    const query = 'query A { ping } query B { me { id } }';
    const shape = describe_(query, { operationName: 'B' });
    expect(shape.name).toBe('B');
    expect(shape.signature).not.toContain('ping');
  });

  it('skips introspection fields, in roots and in coordinates', () => {
    const shape = describe_('query Q { __typename me { __typename id } }');
    expect(shape.root_fields).toEqual(['me']);
    expect(shape.fields).toEqual(['Query.me', 'User.id']);
  });

  it('ignores inline fragment roots when listing root fields', () => {
    const shape = describe_('query Q { ... on Query { ping } me { id } }');
    expect(shape.root_fields).toEqual(['me']);
  });

  it('has no coordinates without a schema, and skips fields the schema does not define', () => {
    expect(describe_('query Q { me { id } }', { withSchema: false }).fields).toEqual([]);
    expect(describe_('query Q { nope { id } ping }').fields).toEqual(['Query.ping']);
  });

  it('caps the coordinates remembered per document at 500', () => {
    const bigSchema = buildSchema(`type Query { ${Array.from({ length: 520 }, (_, i) => `f${i}: String`).join(' ')} }`);
    const document = parse(`query W { ${Array.from({ length: 520 }, (_, i) => `f${i}`).join(' ')} }`);
    const operation = document.definitions[0] as OperationDefinitionNode;
    const big = describeOperation(hash(), document, operation, bigSchema);
    expect(big.fields).toHaveLength(500);
    expect(big.fields[0]).toBe('Query.f0');
  });

  it('truncates a signature past 20,000 characters but still describes it', () => {
    const long = `query Big { me { ${Array.from({ length: 3000 }, (_, i) => `a${i}: id`).join(' ')} } }`;
    const shape = describe_(long);
    expect(shape.signature).toHaveLength(20_000);
    expect(shape.root_fields).toEqual(['me']);
  });

  it('memoises per query hash and operation name', () => {
    const queryHash = hash();
    const first = describe_('query Q { ping }', { hash: queryHash });
    const again = describe_('query Q { me { id } }', { hash: queryHash });
    expect(again).toBe(first);
    const other = describe_('query R { ping }', { hash: queryHash });
    expect(other).not.toBe(first);
  });

  it('drops the memo wholesale once it reaches 2000 entries', () => {
    const firstHash = hash();
    const first = describe_('query Q { ping }', { hash: firstHash });
    for (let i = 0; i < 2000; i += 1) describe_('query Q { ping }', { hash: hash() });
    const rebuilt = describe_('query Q { ping }', { hash: firstHash });
    expect(rebuilt).not.toBe(first);
    expect(rebuilt).toEqual(first);
  });
});

describe('INVALID_OPERATION', () => {
  it('is the single bucket for requests that never became an operation', () => {
    expect(INVALID_OPERATION).toEqual({
      op_key: 'invalid', name: '(invalid request)', type: 'UNKNOWN', signature: '', root_fields: [], fields: [],
    });
  });
});
