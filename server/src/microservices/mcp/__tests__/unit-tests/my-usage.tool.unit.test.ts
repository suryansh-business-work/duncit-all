jest.mock('../../usage/usage.service', () => ({ mcpUsageService: { summary: jest.fn() } }));

import { ToolInputError } from '../../execute/validate';
import { myUsageTool } from '../../tools/meta/usage.tool';
import { mcpUsageService } from '../../usage/usage.service';
import { MEMBER, SUPER_ADMIN, toolContext } from './fixtures';

const summary = mcpUsageService.summary as jest.Mock;
const NOW = Date.parse('2026-10-26T10:00:00.000Z');
const DAY = 24 * 60 * 60 * 1000;

const bucket = (key: string, calls = 1) => ({ key, calls, errors: 0, blocked: 0, input_tokens: 10, output_tokens: 20, cost: 0.0003, avg_ms: 12, last_at: null });

function summaryOf(tools = 3) {
  return {
    scope: 'MINE',
    from: '2026-10-19T10:00:00.000Z',
    to: '2026-10-26T10:00:00.000Z',
    time_zone: 'Asia/Kolkata',
    totals: { ...bucket('total', 9), users: 1 },
    by_tool: Array.from({ length: tools }, (_, i) => bucket(`tool_${i}`, tools - i)),
    by_category: [bucket('pods')],
    by_client: [bucket('Claude', 7), bucket('ChatGPT', 2)],
    by_endpoint: [bucket('pods')],
    by_status: [bucket('OK')],
    by_day: [bucket('2026-10-25'), bucket('2026-10-26')],
    by_user: [],
  };
}

beforeEach(() => {
  jest.spyOn(Date, 'now').mockReturnValue(NOW);
  summary.mockReset().mockResolvedValue(summaryOf());
});

afterEach(() => jest.restoreAllMocks());

describe('mcp_my_usage', () => {
  it('is read-only and listed everywhere', () => {
    expect(myUsageTool).toMatchObject({ risk: 'READ', listedOn: ['*'], category: 'mcp' });
  });

  it('asks for the last seven days by default', async () => {
    await myUsageTool.run(toolContext({ user: MEMBER }), {});
    expect(summary).toHaveBeenCalledWith(MEMBER, { from: new Date(NOW - 7 * DAY).toISOString(), user_id: MEMBER.id });
  });

  it('asks for the number of days given', async () => {
    await myUsageTool.run(toolContext({ user: MEMBER }), { days: 30 });
    expect(summary.mock.calls[0][1].from).toBe(new Date(NOW - 30 * DAY).toISOString());
  });

  it('always narrows to the caller’s own calls, even for someone who could see everyone', async () => {
    await myUsageTool.run(toolContext({ user: SUPER_ADMIN }), {});
    expect(summary).toHaveBeenCalledWith(SUPER_ADMIN, expect.objectContaining({ user_id: SUPER_ADMIN.id }));
  });

  it('returns the window, totals, apps and days from the summary', async () => {
    const result = await myUsageTool.run(toolContext({ user: MEMBER }), { days: 7 });
    const expected = summaryOf();
    expect(result).toEqual({
      days: 7,
      from: expected.from,
      to: expected.to,
      time_zone: 'Asia/Kolkata',
      totals: expected.totals,
      top_tools: expected.by_tool,
      by_app: expected.by_client,
      by_day: expected.by_day,
    });
  });

  it('keeps the top fifteen tools only', async () => {
    summary.mockResolvedValue(summaryOf(40));
    const result = (await myUsageTool.run(toolContext({ user: MEMBER }), {})) as { top_tools: Array<{ key: string }> };
    expect(result.top_tools).toHaveLength(15);
    expect(result.top_tools[0].key).toBe('tool_0');
    expect(result.top_tools[14].key).toBe('tool_14');
  });

  it('does not expose the everyone-only breakdowns', async () => {
    const result = await myUsageTool.run(toolContext({ user: MEMBER }), {});
    expect(result).not.toHaveProperty('by_user');
    expect(result).not.toHaveProperty('scope');
  });

  it('accepts the boundaries of 1 and 90 days', async () => {
    await myUsageTool.run(toolContext({ user: MEMBER }), { days: 1 });
    await myUsageTool.run(toolContext({ user: MEMBER }), { days: 90 });
    expect(summary.mock.calls.map((call) => call[1].from)).toEqual([new Date(NOW - DAY).toISOString(), new Date(NOW - 90 * DAY).toISOString()]);
  });

  it.each([[{ days: 0 }], [{ days: 91 }], [{ days: 2.5 }], [{ days: '7' }], [{ user_id: 'someone-else' }]])(
    'refuses %j without reading anything',
    async (args) => {
      await expect(myUsageTool.run(toolContext({ user: MEMBER }), args)).rejects.toBeInstanceOf(ToolInputError);
      expect(summary).not.toHaveBeenCalled();
    }
  );

  it('passes on a failure of the usage read', async () => {
    summary.mockRejectedValue(new Error('aggregate failed'));
    await expect(myUsageTool.run(toolContext({ user: MEMBER }), {})).rejects.toThrow('aggregate failed');
  });
});
