import { buildSchema, isObjectType, parse, print, validate, type OperationDefinitionNode } from 'graphql';
import { META_CONFIRM, META_GUARD, META_REASON } from '../../mcp.constants';
import { buildGraphQLTools, isSelectableLeaf, type CatalogSource } from '../../catalog/build';
import type { GraphQLTool } from '../../tools/tool.types';
import { FIXTURE_RESOLVERS, FIXTURE_TYPE_DEFS } from './fixtures';

const build = (typeDefsByModule: CatalogSource['typeDefsByModule'], resolvers: CatalogSource['resolvers'] = []) =>
  buildGraphQLTools({ typeDefsByModule, resolvers });

const fixture = build(FIXTURE_TYPE_DEFS, FIXTURE_RESOLVERS);
const named = (tools: readonly GraphQLTool[], name: string): GraphQLTool => {
  const found = tools.find((tool) => tool.name === name);
  if (!found) throw new Error(`no tool ${name}`);
  return found;
};
const same = (document: GraphQLTool['document'], expected: string) => expect(print(document)).toBe(print(parse(expected)));

describe('buildGraphQLTools — which fields become tools', () => {
  it('builds one tool per exposed Query and Mutation field, queries first', () => {
    expect(fixture.tools.map((tool) => tool.name)).toEqual([
      'pods_pods_table',
      'pods_pod',
      'pods_pod_count',
      'clubs_clubs_table',
      'venues_venue',
      'finance_payout_summary',
      'chat_pod_chat_messages',
      'pods_create_pod',
      'pods_delete_pod',
      'pods_join_free_pod',
      'pods_send_pod_reminder',
      'finance_approve_payment_release',
      'finance_refund_payment',
    ]);
  });

  it('skips fields of modules kept out of MCP, naming the module', () => {
    const notExposed = fixture.skipped.filter((field) => field.reason === 'its module is not exposed to MCP');
    expect(notExposed).toEqual([
      { field: '_empty', kind: 'QUERY', module: 'rootTypeDefs', reason: 'its module is not exposed to MCP' },
      { field: '_empty', kind: 'MUTATION', module: 'rootTypeDefs', reason: 'its module is not exposed to MCP' },
      { field: 'login', kind: 'MUTATION', module: 'authTypeDefs', reason: 'its module is not exposed to MCP' },
      { field: 'verifyOtp', kind: 'MUTATION', module: 'authTypeDefs', reason: 'its module is not exposed to MCP' },
    ]);
  });

  it('skips denied fields in an exposed module with the denylist reason', () => {
    expect(fixture.skipped).toContainEqual({ field: 'staffCallIceServers', kind: 'QUERY', module: 'chatTypeDefs', reason: 'returns TURN relay credentials' });
    expect(fixture.skipped).toContainEqual({ field: 'resetUserPassword', kind: 'MUTATION', module: 'userTypeDefs', reason: 'passwords are set by the person' });
  });

  it('treats a field on a root type not called Query (schema { query: Root }) as owned by no module', () => {
    const built = build({ podTypeDefs: 'schema { query: Root } type Root { podsTable: Int }' });
    expect(built.tools).toEqual([]);
    expect(built.skipped).toEqual([{ field: 'podsTable', kind: 'QUERY', module: 'unknown', reason: 'its module is not exposed to MCP' }]);
  });

  it('keeps out a module the category map does not know', () => {
    const built = build({ brandNewTypeDefs: 'type Query { shiny: Int }' });
    expect(built.tools).toEqual([]);
    expect(built.skipped[0]).toMatchObject({ field: 'shiny', module: 'brandNewTypeDefs' });
  });

  it('files a field by the module that declares it, extensions included, and accepts parsed documents', () => {
    const built = build({
      rootTypeDefs: 'type Query { _empty: String }',
      ecommBrandTypeDefs: parse('extend type Query { brandProducts: Int }'),
    });
    expect(built.tools).toHaveLength(1);
    expect(built.tools[0]).toMatchObject({ name: 'partner_brand_brand_products', category: 'partner-brand', module: 'ecommBrandTypeDefs' });
  });
});

describe('buildGraphQLTools — the tool record', () => {
  const tool = named(fixture.tools, 'pods_pods_table');

  it('carries what the pipeline needs to run the field', () => {
    expect(tool).toMatchObject({
      source: 'graphql',
      title: 'Pods table',
      category: 'pods',
      kind: 'QUERY',
      risk: 'READ',
      confirm: false,
      outward: false,
      field: 'podsTable',
      module: 'podTypeDefs',
      operationName: 'Mcp_podsTable',
      argNames: ['query', 'include_deleted'],
    });
  });

  it('rates mutations by name and marks the ones needing confirmation', () => {
    expect(named(fixture.tools, 'pods_create_pod')).toMatchObject({ kind: 'MUTATION', risk: 'WRITE', confirm: false });
    expect(named(fixture.tools, 'pods_delete_pod')).toMatchObject({ risk: 'DESTRUCTIVE', confirm: true });
    expect(named(fixture.tools, 'finance_approve_payment_release')).toMatchObject({ risk: 'WRITE', confirm: true });
    expect(named(fixture.tools, 'pods_send_pod_reminder')).toMatchObject({ risk: 'WRITE', outward: true });
  });

  it('builds a document every tool can run against the schema it came from', () => {
    for (const each of fixture.tools) expect(validate(fixture.schema, each.document)).toEqual([]);
  });

  it('uses a query operation for queries and a mutation operation for mutations', () => {
    const operation = (t: GraphQLTool) => (t.document.definitions[0] as OperationDefinitionNode).operation;
    expect(operation(tool)).toBe('query');
    expect(operation(named(fixture.tools, 'pods_delete_pod'))).toBe('mutation');
  });
});

describe('buildGraphQLTools — result selections', () => {
  it('selects plain fields, follows embedded objects, skips credentials and resolver-backed fields', () => {
    same(
      named(fixture.tools, 'pods_pods_table').document,
      `query Mcp_podsTable($query: TableQueryInput, $include_deleted: Boolean) {
        podsTable(query: $query, include_deleted: $include_deleted) {
          rows { id pod_title pod_date_time pod_end_date_time venue_id pod_hosts_id status host { name } }
          total
        }
      }`
    );
  });

  it('selects nothing under a field that returns a scalar', () => {
    same(named(fixture.tools, 'pods_pod_count').document, 'query Mcp_podCount { podCount }');
  });

  const shapes = build({
    podTypeDefs: /* GraphQL */ `
      interface Node {
        id: ID!
      }
      type Card implements Node {
        id: ID!
      }
      union SearchHit = Card
      type Secrets {
        access_token: String
        api_key: String
      }
      type L1 {
        a: Int
        l2: L2
      }
      type L2 {
        b: Int
        l3: L3
      }
      type L3 {
        c: Int
        l4: L4
      }
      type L4 {
        d: Int
      }
      type WithArgs {
        plain: Int
        counted(limit: Int!): Int
        optional(limit: Int): Int
        defaulted(limit: Int! = 5): Int
      }
      type Holder {
        secrets: Secrets
        n: Int
      }
      type Query {
        node: Node
        hits: [SearchHit]
        secrets: Secrets
        deep: L1
        withArgs: WithArgs
        holder: Holder
        page(n: Int! = 1): Int
      }
    `,
  });

  it('asks only for __typename from an interface or a union', () => {
    same(named(shapes.tools, 'pods_node').document, 'query Mcp_node { node { __typename } }');
    same(named(shapes.tools, 'pods_hits').document, 'query Mcp_hits { hits { __typename } }');
  });

  it('falls back to __typename when every field of the object is a credential', () => {
    same(named(shapes.tools, 'pods_secrets').document, 'query Mcp_secrets { secrets { __typename } }');
  });

  it('follows embedded objects at most three levels down', () => {
    same(named(shapes.tools, 'pods_deep').document, 'query Mcp_deep { deep { a l2 { b l3 { c } } } }');
  });

  it('never selects a nested field that needs an argument nobody gave', () => {
    same(named(shapes.tools, 'pods_with_args').document, 'query Mcp_withArgs { withArgs { plain optional defaulted } }');
  });

  it('drops a nested object whose every field is a credential', () => {
    same(named(shapes.tools, 'pods_holder').document, 'query Mcp_holder { holder { n } }');
  });

  it('declares a required argument with a default as nullable, so the default applies', () => {
    same(named(shapes.tools, 'pods_page').document, 'query Mcp_page($n: Int) { page(n: $n) }');
    expect(validate(shapes.schema, named(shapes.tools, 'pods_page').document)).toEqual([]);
  });

  it('honours a resolver declared in any of the resolver maps', () => {
    const withResolver = build({ podTypeDefs: 'type Query { holder: Holder } type Holder { n: Int deep: L1 } type L1 { a: Int }' }, [{}, { Holder: { deep: () => null } }]);
    same(withResolver.tools[0].document, 'query Mcp_holder { holder { n } }');
  });

  it('selects a credential-named flag but never the credential, and keeps token counts', () => {
    const provider = build({
      crmTypeDefs: /* GraphQL */ `
        type Provider {
          name: String
          has_api_key: Boolean!
          api_key: String
          otp: Int
          prompt_tokens: Int
        }
        type Query {
          commsProvider: Provider
        }
      `,
    });
    same(provider.tools[0].document, 'query Mcp_commsProvider { commsProvider { name has_api_key prompt_tokens } }');
  });
});

describe('isSelectableLeaf', () => {
  const leavesType = buildSchema(/* GraphQL */ `
    enum Level {
      LOW
    }
    type Leaves {
      has_api_key: Boolean!
      is_token_valid: Boolean
      secret_flags: [Boolean!]
      api_key: String
      access_token: ID
      otp: Int
      card_cvv: Float
      secret_level: Level
      token_count: Int
      pod_title: String
      seats_taken: Int
    }
    type Query {
      leaves: Leaves
    }
  `)
    .getType('Leaves');
  const leaf = (name: string) => {
    if (!isObjectType(leavesType)) throw new Error('no Leaves type');
    return leavesType.getFields()[name];
  };

  it.each(['has_api_key', 'is_token_valid', 'secret_flags'])('always selects the Boolean %s — a flag is never a credential', (name) => {
    expect(isSelectableLeaf(leaf(name))).toBe(true);
  });

  it.each(['api_key', 'access_token'])('never selects the text field %s', (name) => {
    expect(isSelectableLeaf(leaf(name))).toBe(false);
  });

  it.each(['otp', 'card_cvv'])('does not exempt the number %s — a code or a PIN can be a number', (name) => {
    expect(isSelectableLeaf(leaf(name))).toBe(false);
  });

  it('does not exempt an enum with a credential name', () => {
    expect(isSelectableLeaf(leaf('secret_level'))).toBe(false);
  });

  it.each(['token_count', 'pod_title', 'seats_taken'])('selects the ordinary field %s', (name) => {
    expect(isSelectableLeaf(leaf(name))).toBe(true);
  });
});

describe('buildGraphQLTools — input schema', () => {
  it('adds the meta parameters to every tool', () => {
    for (const tool of fixture.tools) {
      expect(tool.inputSchema.properties).toHaveProperty(META_REASON);
      expect(tool.inputSchema.properties).toHaveProperty(META_GUARD);
      expect(tool.inputSchema.additionalProperties).toBe(false);
    }
  });

  it('requires the GraphQL arguments, a reason and the confirmation of a destructive tool', () => {
    const remove = named(fixture.tools, 'pods_delete_pod').inputSchema;
    expect(Object.keys(remove.properties)).toEqual(['id', 'reason', META_REASON, META_GUARD, META_CONFIRM]);
    expect(remove.required).toEqual(['id', META_REASON, META_CONFIRM]);
  });

  it('keeps a defaulted argument optional and shows its default', () => {
    const table = named(fixture.tools, 'pods_pods_table').inputSchema;
    expect(table.required).toBeUndefined();
    expect(table.properties.include_deleted).toMatchObject({ type: 'boolean', default: false });
    expect(table.properties.query).toMatchObject({ type: 'object', additionalProperties: false });
  });
});

describe('buildGraphQLTools — descriptions', () => {
  it('opens with the category and risk, then the field description, then how it runs', () => {
    expect(named(fixture.tools, 'pods_pods_table').description).toBe(
      "[Pods · Read-only] Pods in the console's table, paged and filtered. Runs the Duncit GraphQL query `podsTable` with the signed-in person's own permissions, exactly as their console would."
    );
  });

  it('uses the title when the field has no description and warns about side effects of a write', () => {
    expect(named(fixture.tools, 'pods_create_pod').description).toBe(
      "[Pods · Writes data] Create pod. Runs the Duncit GraphQL mutation `createPod` with the signed-in person's own permissions, exactly as their console would. It has the same side effects as doing it in the console (history, audit log, notifications)."
    );
  });

  it('tells the model to ask first on a tool that needs confirmation', () => {
    const description = named(fixture.tools, 'pods_delete_pod').description;
    expect(description.startsWith('[Pods · Destructive] Delete pod.')).toBe(true);
    expect(description.endsWith('Tell the user exactly what will happen and only call it with mcp_confirm: true after they say yes.')).toBe(true);
  });

  it('appends the deprecation reason and clips a very long description', () => {
    const built = build({ podTypeDefs: `type Query { "${'Long. '.repeat(150)}" oldPods: Int @deprecated(reason: "Use podsTable") }` });
    const { description } = built.tools[0];
    expect(description.endsWith('Deprecated: Use podsTable')).toBe(true);
    const summary = description.slice('[Pods · Read-only] '.length, description.indexOf(' Runs the Duncit'));
    expect(summary).toHaveLength(700);
    expect(summary.endsWith('…')).toBe(true);
  });
});
