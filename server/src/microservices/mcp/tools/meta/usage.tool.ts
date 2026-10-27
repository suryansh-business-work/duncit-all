import { z } from 'zod';
import { mcpUsageService } from '../../usage/usage.service';
import { defineTool } from '../define';

/** mcp_my_usage — the person's own MCP activity: how many calls, which tools, how it went, tokens and cost. */

const DAY_MS = 24 * 60 * 60 * 1000;
const TOP_TOOLS = 15;

export const myUsageTool = defineTool({
  name: 'mcp_my_usage',
  title: 'My MCP usage',
  description:
    '[MCP · Read-only] Your own MCP activity over the last few days: total calls, errors, blocked calls, estimated tokens and cost, your most-used tools, which AI apps you used, and calls per day. Everyone\'s activity is on the MCP console\'s dashboard (MCP managers).',
  category: 'mcp',
  listedOn: ['*'],
  schema: z.object({ days: z.number().int().min(1).max(90).default(7).describe('How many days back to look.') }).strict(),
  async run(context, args) {
    const summary = await mcpUsageService.summary(context.user, {
      from: new Date(Date.now() - args.days * DAY_MS).toISOString(),
      user_id: context.user.id,
    });
    return {
      days: args.days,
      from: summary.from,
      to: summary.to,
      time_zone: summary.time_zone,
      totals: summary.totals,
      top_tools: summary.by_tool.slice(0, TOP_TOOLS),
      by_app: summary.by_client,
      by_day: summary.by_day,
    };
  },
});
