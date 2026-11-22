import { Types } from 'mongoose';
import type { GraphQLContext } from '@context';
import type { TableQueryInput } from '@utils/table-query';
import { CODE_PROMPTS } from '@modules/ai/prompt/catalog';
import { askDuncitAnalytics } from '../analytics/askDuncit.analytics';
import { askDuncitAdminTables, type AuditPreset } from '../admin/askDuncit.adminTables';
import { askDuncitToolsAdmin, type ToolAccess } from '../admin/askDuncit.toolsAdmin';
import type { AskDuncitRoleKey } from '../askDuncit.constants';
import { verifyAuditHash } from '../audit/askDuncitAudit.hash';
import { AskDuncitAuditModel, type IAskDuncitAudit } from '../audit/askDuncitAudit.model';
import type { ReviewStatus } from '../conversation/askDuncitMessage.model';
import { askDuncitKnowledge, type KnowledgeInput } from '../knowledge/askDuncit.knowledge';
import type { IAskDuncitKnowledge } from '../knowledge/askDuncitKnowledge.model';
import { operatorActor, requireAskDuncitControl, requireAskDuncitOperator } from '../rbac/askDuncit.access';
import { askDuncitSettingsService } from '../settings/askDuncitSettings.service';
import type { AskDuncitRolePolicyInput, AskDuncitSettingsInput } from '../settings/askDuncitSettings.types';

/**
 * The AI portal's Ask Duncit API. Operator gate on reads and day-to-day edits;
 * the Control Center gate (SUPER_ADMIN) on anything that changes what the
 * assistant may do for people.
 */

type Q = { query?: TableQueryInput | null };

const pubArticle = (a: IAskDuncitKnowledge, withBody = true) => ({
  id: String(a._id),
  title: a.title,
  body: withBody ? a.body : null,
  kind: a.kind,
  audience_roles: a.audience_roles,
  tags: a.tags,
  locale: a.locale,
  status: a.status,
  version: a.version,
  hits: a.hits,
  updated_at: a.updated_at ? new Date(a.updated_at).toISOString() : null,
});

const plain = <T>(doc: T): T => {
  const withToObject = doc as T & { toObject?: () => T };
  return typeof withToObject.toObject === 'function' ? withToObject.toObject() : doc;
};

const ASK_DUNCIT_PROMPT_KEYS = CODE_PROMPTS.filter((p) => p.key.startsWith('ask_duncit.')).map((p) => p.key);

const days = (value: number | null | undefined, fallback = 30) => Math.min(Math.max(value ?? fallback, 1), 365);

export const askDuncitAdminResolvers = {
  Query: {
    askDuncitSettings: (_: unknown, __: unknown, ctx: GraphQLContext) => {
      requireAskDuncitOperator(ctx);
      return askDuncitSettingsService.get();
    },
    askDuncitDashboard: (_: unknown, args: { days?: number | null }, ctx: GraphQLContext) => {
      requireAskDuncitOperator(ctx);
      return askDuncitAnalytics.dashboard(days(args.days));
    },
    askDuncitCost: (_: unknown, args: { days?: number | null }, ctx: GraphQLContext) => {
      requireAskDuncitOperator(ctx);
      return askDuncitAnalytics.cost(days(args.days));
    },
    askDuncitAuditTable: (_: unknown, args: Q & { preset?: AuditPreset | null }, ctx: GraphQLContext) => {
      requireAskDuncitOperator(ctx);
      return askDuncitAdminTables.audit(args.query, args.preset ?? 'ALL');
    },
    askDuncitVerifyAudit: async (_: unknown, args: { id: string }, ctx: GraphQLContext) => {
      requireAskDuncitOperator(ctx);
      if (!Types.ObjectId.isValid(args.id)) return false;
      const row = await AskDuncitAuditModel.findById(args.id).lean<IAskDuncitAudit>();
      return row ? verifyAuditHash(row) : false;
    },
    askDuncitConversationsTable: (_: unknown, args: Q & { live?: boolean | null }, ctx: GraphQLContext) => {
      requireAskDuncitOperator(ctx);
      return askDuncitAdminTables.conversations(args.query, Boolean(args.live));
    },
    askDuncitConversationDetail: (_: unknown, args: { id: string }, ctx: GraphQLContext) => {
      requireAskDuncitOperator(ctx);
      return askDuncitAdminTables.conversation(args.id);
    },
    askDuncitFeedbackTable: (_: unknown, args: Q, ctx: GraphQLContext) => {
      requireAskDuncitOperator(ctx);
      return askDuncitAdminTables.feedback(args.query);
    },
    askDuncitKnowledgeTable: async (_: unknown, args: Q, ctx: GraphQLContext) => {
      requireAskDuncitOperator(ctx);
      const page = await askDuncitKnowledge.table(args.query);
      return { rows: page.docs.map((d) => pubArticle(plain(d), false)), total: page.total, page: page.page, page_size: page.page_size };
    },
    askDuncitKnowledgeArticle: async (_: unknown, args: { id: string }, ctx: GraphQLContext) => {
      requireAskDuncitOperator(ctx);
      const doc = await askDuncitKnowledge.get(args.id);
      return doc ? pubArticle(doc) : null;
    },
    askDuncitToolTable: (_: unknown, args: Q & { role: AskDuncitRoleKey; days?: number | null }, ctx: GraphQLContext) => {
      requireAskDuncitOperator(ctx);
      return askDuncitToolsAdmin.table(args.role, args.query, days(args.days));
    },
    askDuncitToolCategories: (_: unknown, __: unknown, ctx: GraphQLContext) => {
      requireAskDuncitOperator(ctx);
      return askDuncitToolsAdmin.categories();
    },
    askDuncitPromptKeys: (_: unknown, __: unknown, ctx: GraphQLContext) => {
      requireAskDuncitOperator(ctx);
      return ASK_DUNCIT_PROMPT_KEYS;
    },
  },
  Mutation: {
    updateAskDuncitModelSettings: (_: unknown, args: { input: AskDuncitSettingsInput }, ctx: GraphQLContext) =>
      askDuncitSettingsService.update(args.input, operatorActor(requireAskDuncitOperator(ctx))),
    createAskDuncitKnowledge: async (_: unknown, args: { input: KnowledgeInput }, ctx: GraphQLContext) =>
      pubArticle(await askDuncitKnowledge.create(args.input, operatorActor(requireAskDuncitOperator(ctx)))),
    updateAskDuncitKnowledge: async (_: unknown, args: { id: string; input: KnowledgeInput }, ctx: GraphQLContext) =>
      pubArticle(await askDuncitKnowledge.update(args.id, args.input, operatorActor(requireAskDuncitOperator(ctx)))),
    deleteAskDuncitKnowledge: (_: unknown, args: { id: string }, ctx: GraphQLContext) =>
      askDuncitKnowledge.remove(args.id, operatorActor(requireAskDuncitOperator(ctx))),
    reviewAskDuncitFeedback: (
      _: unknown,
      args: { message_id: string; status: ReviewStatus; note?: string | null; add_to_knowledge?: boolean | null },
      ctx: GraphQLContext
    ) =>
      askDuncitAdminTables.reviewFeedback(operatorActor(requireAskDuncitOperator(ctx)), args.message_id, args.status, args.note ?? '', Boolean(args.add_to_knowledge)),
    updateAskDuncitControl: (_: unknown, args: { input: AskDuncitSettingsInput }, ctx: GraphQLContext) =>
      askDuncitSettingsService.update(args.input, operatorActor(requireAskDuncitControl(ctx))),
    setAskDuncitKillSwitch: (_: unknown, args: { on: boolean; reason?: string | null; role?: AskDuncitRoleKey | null }, ctx: GraphQLContext) => {
      const actor = operatorActor(requireAskDuncitControl(ctx));
      if (args.role) return askDuncitSettingsService.updateRole(args.role, { kill_switch: args.on }, actor);
      return askDuncitSettingsService.update({ kill_switch: args.on, kill_switch_reason: args.reason ?? '' }, actor);
    },
    updateAskDuncitRolePolicy: (_: unknown, args: { role: AskDuncitRoleKey; input: AskDuncitRolePolicyInput }, ctx: GraphQLContext) =>
      askDuncitSettingsService.updateRole(args.role, args.input, operatorActor(requireAskDuncitControl(ctx))),
    resetAskDuncitRolePolicy: (_: unknown, args: { role: AskDuncitRoleKey }, ctx: GraphQLContext) =>
      askDuncitSettingsService.resetRole(args.role, operatorActor(requireAskDuncitControl(ctx))),
    setAskDuncitToolAccess: (
      _: unknown,
      args: { role: AskDuncitRoleKey; tool: string; access: ToolAccess; force_approval?: boolean | null },
      ctx: GraphQLContext
    ) => askDuncitToolsAdmin.setAccess(args.role, args.tool, args.access, args.force_approval ?? null, operatorActor(requireAskDuncitControl(ctx))),
  },
};
