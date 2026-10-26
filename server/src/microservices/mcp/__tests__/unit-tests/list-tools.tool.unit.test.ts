import { GraphQLError } from 'graphql';
import { ToolInputError } from '../../execute/validate';
import { GATEWAY_ENDPOINT } from '../../mcp.constants';
import { listToolsTool } from '../../tools/meta/catalog.tools';
import { PODS_STAFF, READ_ONLY, toolContext } from './fixtures';

interface Row {
  name: string;
  title: string;
  category: string;
  risk: string;
  needs_confirmation: boolean;
  summary: string;
}
interface Listing {
  endpoint: string;
  total: number;
  page: number;
  page_size: number;
  pages: number;
  categories: Array<{ category: string; label: string; tools: number }>;
  tools: Row[];
}

const list = async (args: Record<string, unknown> = {}, options: Parameters<typeof toolContext>[0] = {}) =>
  (await listToolsTool.run(toolContext({ user: PODS_STAFF, endpoint: 'pods', ...options }), args)) as Listing;
const names = (listing: Listing) => listing.tools.map((tool) => tool.name);

describe('mcp_list_tools', () => {
  it('lists this connector’s tools by default, one page of 50', async () => {
    const listing = await list();
    expect(listing).toMatchObject({ endpoint: 'pods', total: 15, page: 1, page_size: 50, pages: 1 });
    expect(names(listing)).toContain('pods_create_pod');
    expect(names(listing)).not.toContain('mcp_call_tool');
  });

  it('lists every usable tool across all consoles for endpoint "gateway"', async () => {
    const listing = await list({ endpoint: GATEWAY_ENDPOINT });
    expect(listing.total).toBe(19);
    expect(names(listing)).toEqual(expect.arrayContaining(['mcp_call_tool', 'clubs_clubs_table', 'venues_venue', 'chat_pod_chat_messages']));
    expect(names(listing)).not.toContain('finance_payout_summary');
  });

  it('refuses a connector the person cannot open', async () => {
    const error = await list({ endpoint: 'finance' }).catch((caught: unknown) => caught);
    expect(error).toBeInstanceOf(GraphQLError);
    expect(error).toMatchObject({ message: 'You cannot open the "finance" connector.', extensions: { code: 'BAD_USER_INPUT' } });
  });

  it('filters by category', async () => {
    expect((await list({ category: 'mcp' })).total).toBe(7);
  });

  it('filters by risk', async () => {
    expect(names(await list({ risk: 'DESTRUCTIVE' }))).toEqual(['pods_delete_pod']);
  });

  it('searches name, title and description case-insensitively', async () => {
    expect(names(await list({ search: 'JOIN' }))).toEqual(['pods_join_free_pod']);
  });

  it('combines filters', async () => {
    // pods_audit_timings matches through its description ("Reads through podsTable").
    expect(names(await list({ category: 'pods', risk: 'READ', search: 'table' }))).toEqual(['pods_audit_timings', 'pods_pods_table']);
  });

  it('pages through the matches', async () => {
    const listing = await list({ page: 2, page_size: 4 });
    expect(listing).toMatchObject({ total: 15, page: 2, page_size: 4, pages: 4 });
    expect(names(listing)).toEqual(['mcp_audit_tools', 'mcp_my_usage', 'mcp_self_test', 'pods_audit_timings']);
  });

  it('returns an empty page past the end but keeps the total', async () => {
    const listing = await list({ page: 5, page_size: 4 });
    expect(listing.tools).toEqual([]);
    expect(listing.total).toBe(15);
  });

  it('counts the matches per category, largest first', async () => {
    expect((await list()).categories).toEqual([
      { category: 'pods', label: 'Pods', tools: 8 },
      { category: 'mcp', label: 'MCP', tools: 7 },
    ]);
  });

  it('gives each tool a short row with its risk and a summary without the tag', async () => {
    const row = (await list({ search: 'delete' })).tools.find((tool) => tool.name === 'pods_delete_pod');
    expect(row).toMatchObject({ title: 'Delete pod', category: 'pods', risk: 'DESTRUCTIVE', needs_confirmation: true });
    expect(row?.summary.startsWith('Delete pod. Runs the Duncit GraphQL mutation')).toBe(true);
    expect(row?.summary.length).toBeLessThanOrEqual(180);
  });

  it('hides writing tools on a read-only connection', async () => {
    const listing = await list({}, { scopes: READ_ONLY });
    expect(listing.total).toBe(11);
    expect(listing.tools.every((tool) => tool.risk === 'READ')).toBe(true);
  });

  it.each([
    [{ page_size: 0 }],
    [{ page_size: 201 }],
    [{ page: 0 }],
    [{ page: 1.5 }],
    [{ category: 'nope' }],
    [{ risk: 'MAYBE' }],
    [{ search: '' }],
    [{ endpoint: '' }],
    [{ unknown: true }],
  ])('refuses invalid arguments %j', async (args) => {
    await expect(list(args)).rejects.toBeInstanceOf(ToolInputError);
  });
});
