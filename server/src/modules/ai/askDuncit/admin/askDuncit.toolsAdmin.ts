import { GraphQLError } from 'graphql';
import { getCatalog } from '@microservices/mcp/catalog/catalog';
import { categoryLabel, MCP_CATEGORIES } from '@microservices/mcp/catalog/categories';
import { summaryOf } from '@microservices/mcp/tools/meta/shared';
import { applyTableQueryInMemory, type TableEntityConfig, type TableQueryInput } from '@utils/table-query';
import type { AskDuncitRoleKey } from '../askDuncit.constants';
import { sinceDays } from '../analytics/askDuncit.analytics';
import { AskDuncitAuditModel } from '../audit/askDuncitAudit.model';
import type { AuditActor } from '../audit/askDuncitAudit.service';
import { approvalRequired, isEngineExcluded, policyAllows } from '../rbac/askDuncit.capabilities';
import { askDuncitSettingsService } from '../settings/askDuncitSettings.service';

/**
 * MCP & Tool Management: every tool the assistant could reach, as one role's
 * policy sees it — allowed or not, whether it waits for approval, and how it
 * has been used. "Allowed" here is the ROLE layer only; at run time the MCP
 * refusal rules and the resolver's RBAC still apply per person.
 */

export const TOOL_ACCESS = ['ALLOW', 'BLOCK', 'DEFAULT'] as const;
export type ToolAccess = (typeof TOOL_ACCESS)[number];

const TOOL_TABLE: TableEntityConfig = {
  searchFields: ['name', 'title', 'summary', 'category_label'],
  sortFields: { name: 'name', category: 'category', calls: 'calls', failures: 'failures', risk: 'risk' },
  filterFields: { category: { type: 'enum' }, risk: { type: 'enum' }, allowed: { type: 'boolean' }, approval_required: { type: 'boolean' }, blocked: { type: 'boolean' } },
  defaultSort: { calls: -1 },
};

async function usageByTool(days: number) {
  const rows = await AskDuncitAuditModel.aggregate<{ _id: string; calls: number; failures: number }>([
    { $match: { type: 'TOOL_CALL', created_at: { $gte: sinceDays(days) } } },
    { $group: { _id: '$tool', calls: { $sum: 1 }, failures: { $sum: { $cond: [{ $ne: ['$status', 'OK'] }, 1, 0] } } } },
  ]);
  return new Map(rows.map((r) => [r._id, r]));
}

export const askDuncitToolsAdmin = {
  async table(role: AskDuncitRoleKey, query: TableQueryInput | null | undefined, days = 30) {
    const [policy, usage] = await Promise.all([askDuncitSettingsService.policyFor(role), usageByTool(days)]);
    const rows = getCatalog()
      .tools.filter((tool) => !isEngineExcluded(tool))
      .map((tool) => ({
        name: tool.name,
        title: tool.title,
        summary: summaryOf(tool.description),
        category: tool.category,
        category_label: categoryLabel(tool.category),
        risk: tool.risk,
        confirm: tool.confirm,
        outward: tool.outward,
        allowed: policyAllows(tool, policy, policy.allow_write),
        blocked: policy.blocked_tools.includes(tool.name),
        explicitly_allowed: policy.allowed_tools.includes(tool.name),
        approval_required: approvalRequired(tool, policy),
        calls: usage.get(tool.name)?.calls ?? 0,
        failures: usage.get(tool.name)?.failures ?? 0,
      }));
    return applyTableQueryInMemory(rows, query, TOOL_TABLE);
  },

  categories() {
    const counts = new Map<string, number>();
    for (const tool of getCatalog().tools) {
      if (!isEngineExcluded(tool)) counts.set(tool.category, (counts.get(tool.category) ?? 0) + 1);
    }
    return MCP_CATEGORIES.filter((c) => counts.has(c.key)).map((c) => ({ key: c.key, label: categoryLabel(c.key), tools: counts.get(c.key) ?? 0 }));
  },

  /** Allow, block or reset one tool for one role, and/or force its approval. */
  async setAccess(role: AskDuncitRoleKey, toolName: string, access: ToolAccess, forceApproval: boolean | null, actor: AuditActor) {
    if (!getCatalog().byName.has(toolName)) throw new GraphQLError('Unknown tool', { extensions: { code: 'BAD_USER_INPUT' } });
    const policy = await askDuncitSettingsService.policyFor(role);
    const without = (list: string[]) => list.filter((name) => name !== toolName);
    const allowed = access === 'ALLOW' ? [...without(policy.allowed_tools), toolName] : without(policy.allowed_tools);
    const blocked = access === 'BLOCK' ? [...without(policy.blocked_tools), toolName] : without(policy.blocked_tools);
    let approval = policy.approval_tools;
    if (forceApproval === true) approval = [...without(approval), toolName];
    if (forceApproval === false) approval = without(approval);
    return askDuncitSettingsService.updateRole(role, { allowed_tools: allowed, blocked_tools: blocked, approval_tools: approval }, actor);
  },
};
