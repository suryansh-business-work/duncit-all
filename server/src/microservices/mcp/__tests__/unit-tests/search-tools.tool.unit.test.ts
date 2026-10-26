import { z } from 'zod';
import { ToolInputError } from '../../execute/validate';
import { GATEWAY_ENDPOINT } from '../../mcp.constants';
import { MCP_ENDPOINTS } from '../../catalog/endpoints';
import { defineTool } from '../../tools/define';
import { scoreTool, searchToolsTool } from '../../tools/meta/catalog.tools';
import { PODS_STAFF, READ_ONLY, toolContext } from './fixtures';

interface Hit {
  name: string;
  score: number;
  risk: string;
  summary: string;
  served_on: string[];
}

const search = async (args: Record<string, unknown>, options: Parameters<typeof toolContext>[0] = {}) =>
  (await searchToolsTool.run(toolContext({ user: PODS_STAFF, ...options }), args)) as { query: string; results: Hit[] };

const timing = defineTool({
  name: 'pods_audit_timings',
  title: 'Audit pod timings',
  description: '[Pods · Read-only] Checks schedules.',
  category: 'pods',
  listedOn: ['pods'],
  schema: z.object({}).strict(),
  run: async () => null,
});

describe('scoreTool', () => {
  it('scores an exact tool name 100, ignoring case and surrounding space', () => {
    expect(scoreTool(timing, 'pods_audit_timings')).toBe(100);
    expect(scoreTool(timing, '  Pods_Audit_Timings ')).toBe(100);
  });

  it('weighs a whole name word 8, the title 3, the category 2 and the description 1', () => {
    expect(scoreTool(timing, 'timings')).toBe(8 + 3);
    expect(scoreTool(timing, 'pods')).toBe(8 + 2 + 1);
    expect(scoreTool(timing, 'schedules')).toBe(1);
  });

  it('weighs part of the name 4 instead of 8', () => {
    expect(scoreTool(timing, 'tim')).toBe(4 + 3);
  });

  it('splits a camelCase query into words', () => {
    expect(scoreTool(timing, 'auditTimings')).toBe(11 + 11);
  });

  it('counts a repeated word once', () => {
    expect(scoreTool(timing, 'audit audit')).toBe(scoreTool(timing, 'audit'));
  });

  it('scores 0 when nothing matches', () => {
    expect(scoreTool(timing, 'venue')).toBe(0);
  });
});

describe('mcp_search_tools', () => {
  it('ranks the best match first with its score', async () => {
    const { results } = await search({ query: 'create pod' });
    expect(results[0]).toMatchObject({ name: 'pods_create_pod', score: 26, risk: 'WRITE' });
    expect(results.map((hit) => hit.score)).toEqual([...results.map((hit) => hit.score)].sort((a, b) => b - a));
  });

  it('breaks ties by name and drops tools that do not match at all', async () => {
    const { results } = await search({ query: 'venue' });
    expect(results.map((hit) => [hit.name, hit.score])).toEqual([
      ['venues_venue', 14],
      ['mcp_search_tools', 1],
      ['pods_audit_timings', 1],
    ]);
  });

  it('returns nothing for a query nothing matches', async () => {
    expect((await search({ query: 'zzzz' })).results).toEqual([]);
  });

  it('puts an exact tool name at the top', async () => {
    expect((await search({ query: 'pods_pod' })).results[0]).toMatchObject({ name: 'pods_pod', score: 100 });
  });

  it('returns at most `limit` results, ten by default', async () => {
    // "the" appears in nearly every description, so far more than ten match.
    expect((await search({ query: 'the', limit: 50 })).results.length).toBeGreaterThan(10);
    expect((await search({ query: 'the' })).results).toHaveLength(10);
    expect((await search({ query: 'the', limit: 2 })).results).toHaveLength(2);
  });

  it('can be narrowed to one category', async () => {
    const { results } = await search({ query: 'pod', category: 'mcp' });
    expect(results.length).toBeGreaterThan(0);
    expect(results.every((hit) => hit.name.startsWith('mcp_'))).toBe(true);
  });

  it('says where each match is served', async () => {
    const { results } = await search({ query: 'create pod' });
    expect(results.find((hit) => hit.name === 'pods_create_pod')?.served_on).toEqual(['admin', 'app', 'partners', 'pods', 'regional-club-admin']);
    const whoami = (await search({ query: 'mcp_whoami' })).results[0];
    expect(whoami.served_on).toEqual([GATEWAY_ENDPOINT, ...MCP_ENDPOINTS.map((endpoint) => endpoint.key)]);
  });

  it('searches only the tools this connection may use', async () => {
    const { results } = await search({ query: 'create pod' }, { scopes: READ_ONLY });
    expect(results.map((hit) => hit.name)).not.toContain('pods_create_pod');
  });

  it('echoes the trimmed query', async () => {
    expect((await search({ query: '  create pod  ' })).query).toBe('create pod');
  });

  it.each([[{ query: 'a' }], [{ query: '   a  ' }], [{ query: 'pod', limit: 0 }], [{ query: 'pod', limit: 51 }], [{}], [{ query: 'pod', category: 'nope' }]])(
    'refuses invalid arguments %j',
    async (args) => {
      await expect(search(args)).rejects.toBeInstanceOf(ToolInputError);
    }
  );
});
