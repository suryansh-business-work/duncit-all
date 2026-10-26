import { GraphQLError, print } from 'graphql';
import { annotationsFor } from '../../catalog/annotations';
import { REFUSAL_MESSAGES } from '../../catalog/visibility';
import { ToolInputError } from '../../execute/validate';
import { GATEWAY_ENDPOINT, META_CONFIRM, META_REASON } from '../../mcp.constants';
import { describeToolTool, exampleArguments } from '../../tools/meta/catalog.tools';
import { buildFixtureCatalog, PODS_STAFF, PUBLIC_URL, READ_ONLY, toolContext, toolNamed } from './fixtures';

const catalog = buildFixtureCatalog();
const describeTool = async (name: string, options: Parameters<typeof toolContext>[0] = {}) =>
  (await describeToolTool.run(toolContext({ user: PODS_STAFF, catalog, ...options }), { name })) as Record<string, unknown>;

const REASON_EXAMPLE = 'One sentence on why the user wants this.';

describe('exampleArguments', () => {
  it('fills in only the required parameters', () => {
    expect(exampleArguments({ type: 'object', properties: { a: { type: 'string' }, b: { type: 'string' } }, required: ['a'] })).toEqual({ a: '<a>' });
  });

  it('writes a reason sentence and a literal true for the meta parameters', () => {
    expect(exampleArguments({ type: 'object', properties: {}, required: [META_REASON, META_CONFIRM] })).toEqual({
      [META_REASON]: REASON_EXAMPLE,
      [META_CONFIRM]: true,
    });
  });

  it('uses a number’s minimum when it is above 1, otherwise 1', () => {
    const example = exampleArguments({
      type: 'object',
      properties: {
        spots: { type: 'integer', minimum: 5 },
        page: { type: 'integer', minimum: 1 },
        int32: { type: 'integer', minimum: -2_147_483_648 },
        price: { type: 'number' },
      },
      required: ['spots', 'page', 'int32', 'price'],
    });
    expect(example).toEqual({ spots: 5, page: 1, int32: 1, price: 1 });
  });

  it('picks the first enum value and a boolean’s const (else false)', () => {
    const example = exampleArguments({
      type: 'object',
      properties: { status: { type: 'string', enum: ['LIVE', 'DRAFT'] }, sure: { type: 'boolean', const: true }, flag: { type: 'boolean' } },
      required: ['status', 'sure', 'flag'],
    });
    expect(example).toEqual({ status: 'LIVE', sure: true, flag: false });
  });

  it('builds one-item arrays and nested objects from their own schemas', () => {
    const example = exampleArguments({
      type: 'object',
      properties: {
        tags: { type: 'array', items: { type: 'string' } },
        anything: { type: 'array' },
        input: { type: 'object', properties: { pod_title: { type: 'string' }, note: { type: 'string' } }, required: ['pod_title'] },
      },
      required: ['tags', 'anything', 'input'],
    });
    expect(example).toEqual({ tags: ['<tags>'], anything: [], input: { pod_title: '<pod_title>' } });
  });

  it('uses null for an untyped value (a custom scalar) and for a required key with no schema', () => {
    expect(exampleArguments({ type: 'object', properties: { when: { description: 'DateTime value' } }, required: ['when', 'ghost'] })).toEqual({
      when: null,
      ghost: null,
    });
  });

  it('is empty when nothing is required', () => {
    expect(exampleArguments({ type: 'object', properties: { a: { type: 'string' } } })).toEqual({});
  });
});

describe('mcp_describe_tool', () => {
  it('describes an API tool in full, with the GraphQL it runs', async () => {
    const tool = toolNamed(catalog, 'pods_delete_pod');
    const described = await describeTool('pods_delete_pod');
    expect(described).toMatchObject({
      name: 'pods_delete_pod',
      title: 'Delete pod',
      category: { key: 'pods', label: 'Pods' },
      kind: 'MUTATION',
      risk: 'DESTRUCTIVE',
      needs_reason: true,
      needs_confirmation: true,
      reaches_outside_duncit: false,
      description: tool.description,
      available: true,
      unavailable_reason: null,
      parameters: tool.inputSchema,
      tool_parameters: ['id', 'reason'],
      annotations: annotationsFor(tool),
    });
    expect(described.graphql).toBe(tool.source === 'graphql' ? print(tool.document) : null);
    expect(String(described.graphql)).toContain('mutation Mcp_deletePod($id: ID!, $reason: String)');
  });

  it('gives an example call with every required parameter', async () => {
    expect((await describeTool('pods_delete_pod')).example_arguments).toEqual({ id: '<id>', [META_REASON]: REASON_EXAMPLE, [META_CONFIRM]: true });
    expect((await describeTool('pods_create_pod')).example_arguments).toEqual({ input: { pod_title: '<pod_title>' }, [META_REASON]: REASON_EXAMPLE });
  });

  it('does not ask a read for a reason', async () => {
    const described = await describeTool('pods_pod');
    expect(described).toMatchObject({ needs_reason: false, needs_confirmation: false, example_arguments: { id: '<id>' } });
  });

  it('cuts the category tag off the summary', async () => {
    expect(String((await describeTool('pods_pods_table')).summary).startsWith("Pods in the console's table")).toBe(true);
  });

  it('says where it is served, with the connector URLs', async () => {
    expect((await describeTool('mcp_call_tool')).served_on).toEqual([{ endpoint: GATEWAY_ENDPOINT, url: `${PUBLIC_URL}/mcp` }]);
    expect((await describeTool('finance_refund_payment')).served_on).toEqual([{ endpoint: 'finance', url: `${PUBLIC_URL}/finance/mcp` }]);
  });

  it('describes a curated tool without GraphQL', async () => {
    expect(await describeTool('mcp_whoami')).toMatchObject({ kind: 'CURATED', graphql: null, tool_parameters: [] });
  });

  it('explains why a tool is unavailable on this connection', async () => {
    expect(await describeTool('pods_create_pod', { scopes: READ_ONLY })).toMatchObject({
      available: false,
      unavailable_reason: REFUSAL_MESSAGES.READ_ONLY_CONNECTION,
    });
  });

  it('describes a tool from a console the person lacks, marked unavailable', async () => {
    expect(await describeTool('finance_payout_summary')).toMatchObject({ available: false, unavailable_reason: REFUSAL_MESSAGES.NO_PORTAL_ACCESS });
  });

  it('refuses an unknown name with a pointer to search', async () => {
    const error = await describeTool('pods_nope').catch((caught: unknown) => caught);
    expect(error).toBeInstanceOf(GraphQLError);
    expect(error).toMatchObject({ message: 'There is no tool called pods_nope. Try mcp_search_tools.', extensions: { code: 'BAD_USER_INPUT' } });
  });

  it('trims the name it is given', async () => {
    expect((await describeTool('  pods_pod  ')).name).toBe('pods_pod');
  });

  it.each([[''], ['   '], ['x'.repeat(65)]])('refuses the name %j', async (name) => {
    await expect(describeTool(name)).rejects.toBeInstanceOf(ToolInputError);
  });
});
