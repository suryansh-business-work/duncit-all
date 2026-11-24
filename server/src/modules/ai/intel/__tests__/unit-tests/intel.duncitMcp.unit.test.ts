/**
 * Duncit MCP, in-process: tools run through the MCP pipeline as the person,
 * with the meta parameters set by the server — never the model — and only
 * inside a signed-in console request.
 */
import { getCatalog } from '@microservices/mcp/catalog/catalog';
import { runToolCall } from '@microservices/mcp/execute/pipeline';
import type { McpTool } from '@microservices/mcp/tools/tool.types';
import { callDuncitTool, searchDuncitTools, toolParameters } from '../../connectors/mcp/mcp.builtin';

jest.mock('@microservices/mcp/execute/pipeline', () => ({ runToolCall: jest.fn() }));
jest.mock('@microservices/mcp/catalog/catalog', () => ({ getCatalog: jest.fn(() => ({ tools: [] })) }));
jest.mock('@microservices/mcp/settings/settings.service', () => ({ mcpSettingsService: { get: jest.fn(async () => ({ disabled_tools: [], disabled_categories: [], write_tools_enabled: true })) } }));
jest.mock('@modules/ai/askDuncit/mcp/askDuncit.session', () => ({ askDuncitApollo: jest.fn(() => ({ apollo: true })) }));

const user = { id: 'u1', roles: ['INTEL_MANAGER'] } as never;
const http = { req: { ip: '10.1.2.3', get: () => 'jest' }, res: {} } as never;
const tool = (name: string, risk: 'READ' | 'WRITE' | 'DESTRUCTIVE', extra: Partial<McpTool> = {}) =>
  ({ name, title: name, category: 'pods', description: `${name} does things with pods`, risk, confirm: false, inputSchema: { type: 'object', properties: { id: { type: 'string' }, mcp_reason: { type: 'string' } }, required: ['id', 'mcp_reason'] }, ...extra }) as unknown as McpTool;
const run = runToolCall as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
  run.mockResolvedValue({ outcome: { ok: true, data: { pods: 3 } } });
});

describe('callDuncitTool', () => {
  it('refuses outside a console request without running anything', async () => {
    await expect(callDuncitTool({ user, http: undefined, tool: tool('pods', 'READ'), args: {}, reason: '', approved: false })).resolves.toMatchObject({ isError: true });
    expect(run).not.toHaveBeenCalled();
  });

  it('runs a read tool as the person with the guard on and the model’s meta parameters dropped', async () => {
    const out = await callDuncitTool({ user, http, tool: tool('pods', 'READ'), args: { id: 'p1', mcp_confirm: true, mcp_reason: 'model says so', mcp_guard: 'warn' }, reason: 'why', approved: false });
    expect(out).toEqual({ text: JSON.stringify({ pods: 3 }), isError: false });
    const [session, name, args, options] = run.mock.calls[0];
    expect(name).toBe('pods');
    expect(args).toEqual({ id: 'p1', mcp_guard: 'block' });
    expect(options).toEqual({ viaGateway: true });
    expect(session.caller.user).toBe(user);
    expect(session.connection.clientName).toBe('Duncit Intel');
    expect(session.meta).toEqual({ ip: '10.1.2.3', userAgent: 'jest' });
    expect(getCatalog).toHaveBeenCalled();
  });

  it('gives a write tool the server’s reason, and confirms only an approved call of a confirm tool', async () => {
    await callDuncitTool({ user, http, tool: tool('cancelPod', 'WRITE', { confirm: true }), args: { id: 'p1' }, reason: 'Host asked to cancel', approved: false });
    expect(run.mock.calls[0][2]).toEqual({ id: 'p1', mcp_guard: 'block', mcp_reason: 'Duncit Intel: Host asked to cancel' });
    await callDuncitTool({ user, http, tool: tool('cancelPod', 'WRITE', { confirm: true }), args: { id: 'p1' }, reason: '', approved: true });
    expect(run.mock.calls[1][2]).toEqual({ id: 'p1', mcp_guard: 'block', mcp_reason: 'Duncit Intel: Requested by the person in Duncit Intel', mcp_confirm: true });
  });

  it('never confirms a tool that does not ask for it', async () => {
    await callDuncitTool({ user, http, tool: tool('renamePod', 'WRITE'), args: {}, reason: 'rename', approved: true });
    expect(run.mock.calls[0][2]).not.toHaveProperty('mcp_confirm');
  });

  it('returns the pipeline’s refusal as the tool’s error', async () => {
    run.mockResolvedValue({ outcome: { ok: false, error: { code: 'FORBIDDEN', message: 'You cannot do that' } } });
    await expect(callDuncitTool({ user, http, tool: tool('pods', 'READ'), args: {}, reason: '', approved: false })).resolves.toEqual({ text: 'You cannot do that', isError: true });
  });
});

describe('tool search and parameters', () => {
  it('finds the best matches for a few words and caps the count', () => {
    const tools = [tool('podsList', 'READ'), tool('venueList', 'READ', { description: 'venues only', category: 'venues' } as Partial<McpTool>), tool('podCancel', 'WRITE')];
    const found = searchDuncitTools(tools, 'pods', 1);
    expect(found).toHaveLength(1);
    expect(found[0].name).toMatch(/^pod/);
    expect(searchDuncitTools(tools, 'zzzz-nothing', 5)).toEqual([]);
  });

  it('shows the model a tool’s parameters without the server-owned meta parameters', () => {
    expect(JSON.parse(toolParameters(tool('pods', 'READ')))).toEqual({ type: 'object', properties: { id: { type: 'string' } }, required: ['id'] });
  });
});
