import type { AuthUser, GraphQLContext } from '@context';
import { requireRole } from '@middleware/rbac';
import { auditActorName } from '@utils/audit-actor';
import { actorOf } from '@modules/platform/backgroundJob/backgroundJob.service';
import { CRM_RW } from '@modules/crm/crm/crm.constants';
import { leadQualityAnalytics } from './leadQuality.analytics';
import { LeadQualityEventModel, type EvidenceVia, type QualityEventDoc } from './leadQuality.model';
import { startRecalc } from './leadQuality.recalc';
import { weightageTotal, type QualityValidationMode } from './leadQuality.rules';
import { searchCrmLeads, type CrmLeadSearchInput } from './leadQuality.search';
import { leadQualityService, type EvidenceDecision } from './leadQuality.service';
import { assertLeadType, leadQualityConfigService, type QualityActor, type QualityConfig, type QualityConfigInput } from './leadQualityConfig.service';

/**
 * Lead Quality Score API. Every operation is CRM staff only (SUPER_ADMIN,
 * CRM_MANAGER) — the console, MCP and Ask Duncit all reach these resolvers,
 * so the same role check and the same validation apply everywhere. There is
 * no way to set a score: scores move only through recorded evidence.
 */

const RW = [...CRM_RW];
/** The rate-limit label every MCP / Ask Duncit operation carries (mcp execute/pipeline.ts). */
const MCP_APP = 'mcp-tools';

export async function qualityActor(user: AuthUser): Promise<QualityActor> {
  return { id: user.id, name: (await auditActorName(user.id)) || user.email || '' };
}

export const viaOf = (ctx: GraphQLContext): EvidenceVia => (ctx.client?.app === MCP_APP ? 'MCP' : 'MANUAL');

const withTotal = (config: QualityConfig) => ({ ...config, weightage_total: weightageTotal(config.criteria) });

function pubEvent(row: QualityEventDoc & { id?: string }) {
  return { ...row, id: String(row._id), created_at: row.created_at instanceof Date ? row.created_at.toISOString() : String(row.created_at) };
}

async function detailsResponse(entity_type: string, lead_id: string, skipped: string[]) {
  const details = await leadQualityService.details(assertLeadType(entity_type), lead_id);
  return { details: { ...details, config: withTotal(details.config) }, skipped_checks: skipped };
}

type LeadArgs = { entity_type: string; lead_id: string };

export const leadQualityResolvers = {
  Query: {
    async crmLeadQualitySettings(_p: unknown, args: { lead_type: string }, ctx: GraphQLContext) {
      requireRole(ctx, RW);
      const leadType = assertLeadType(args.lead_type);
      const [published, draft] = await Promise.all([leadQualityConfigService.published(leadType), leadQualityConfigService.draft(leadType)]);
      return { lead_type: leadType, published: withTotal(published), draft: draft ? withTotal(draft) : null };
    },
    async crmLeadQualityVersions(_p: unknown, args: { lead_type: string }, ctx: GraphQLContext) {
      requireRole(ctx, RW);
      return (await leadQualityConfigService.versions(assertLeadType(args.lead_type))).map(withTotal);
    },
    async crmLeadQualitySettingsHistory(_p: unknown, args: { lead_type: string; limit?: number | null }, ctx: GraphQLContext) {
      requireRole(ctx, RW);
      const rows = await LeadQualityEventModel.find({ entity_type: assertLeadType(args.lead_type), kind: { $in: ['CONFIG_DRAFT', 'CONFIG_PUBLISH', 'CONFIG_DISCARD'] } })
        .sort({ created_at: -1 })
        .limit(Math.min(Math.max(args.limit ?? 50, 1), 200))
        .lean<QualityEventDoc[]>();
      return rows.map(pubEvent);
    },
    validateCrmLeadQualityConfig(_p: unknown, args: { lead_type: string; input: QualityConfigInput; mode: QualityValidationMode }, ctx: GraphQLContext) {
      requireRole(ctx, RW);
      assertLeadType(args.lead_type);
      return leadQualityConfigService.validate(args.input, args.mode);
    },
    async crmLeadQuality(_p: unknown, args: LeadArgs, ctx: GraphQLContext) {
      requireRole(ctx, RW);
      return (await detailsResponse(args.entity_type, args.lead_id, [])).details;
    },
    crmLeadQualityHistory(_p: unknown, args: LeadArgs & { limit?: number | null }, ctx: GraphQLContext) {
      requireRole(ctx, RW);
      return leadQualityService.history(assertLeadType(args.entity_type), args.lead_id, args.limit ?? 50);
    },
    searchCrmLeads(_p: unknown, args: { input: CrmLeadSearchInput }, ctx: GraphQLContext) {
      requireRole(ctx, RW);
      return searchCrmLeads(args.input ?? {});
    },
    crmLeadQualityAnalytics(_p: unknown, args: { entity_type?: string | null }, ctx: GraphQLContext) {
      requireRole(ctx, RW);
      return leadQualityAnalytics(args.entity_type ? assertLeadType(args.entity_type) : null);
    },
  },
  Mutation: {
    async saveCrmLeadQualityDraft(
      _p: unknown,
      args: { lead_type: string; input: QualityConfigInput; revision?: number | null; change_note?: string | null },
      ctx: GraphQLContext
    ) {
      const user = requireRole(ctx, RW);
      const saved = await leadQualityConfigService.saveDraft(assertLeadType(args.lead_type), args.input, await qualityActor(user), {
        revision: args.revision,
        change_note: args.change_note,
      });
      return withTotal(saved);
    },
    async startCrmLeadQualityDraftFromVersion(_p: unknown, args: { lead_type: string; version: number }, ctx: GraphQLContext) {
      const user = requireRole(ctx, RW);
      return withTotal(await leadQualityConfigService.draftFromVersion(assertLeadType(args.lead_type), args.version, await qualityActor(user)));
    },
    async publishCrmLeadQualityConfig(_p: unknown, args: { lead_type: string; revision?: number | null; change_note?: string | null }, ctx: GraphQLContext) {
      const user = requireRole(ctx, RW);
      const leadType = assertLeadType(args.lead_type);
      const config = await leadQualityConfigService.publish(leadType, await qualityActor(user), { revision: args.revision, change_note: args.change_note });
      const job = await startRecalc(actorOf(user), { entity_type: leadType, trigger: 'CONFIG_PUBLISH' });
      return { config: withTotal(config), recalculation_job_id: job?.job_id ?? null };
    },
    async deleteCrmLeadQualityDraft(_p: unknown, args: { lead_type: string }, ctx: GraphQLContext) {
      const user = requireRole(ctx, RW);
      return leadQualityConfigService.discardDraft(assertLeadType(args.lead_type), await qualityActor(user));
    },
    async recordCrmLeadEvidence(_p: unknown, args: LeadArgs & { decisions: EvidenceDecision[] }, ctx: GraphQLContext) {
      const user = requireRole(ctx, RW);
      const leadType = assertLeadType(args.entity_type);
      const outcome = await leadQualityService.recordEvidence(leadType, args.lead_id, args.decisions ?? [], await qualityActor(user), viaOf(ctx));
      return detailsResponse(leadType, args.lead_id, outcome.skipped_checks);
    },
    async recalculateCrmLeadQuality(_p: unknown, args: LeadArgs & { external?: boolean | null }, ctx: GraphQLContext) {
      const user = requireRole(ctx, RW);
      const leadType = assertLeadType(args.entity_type);
      const outcome = await leadQualityService.score(leadType, args.lead_id, {
        trigger: 'RECALCULATE',
        actor: await qualityActor(user),
        external: args.external === true,
      });
      return detailsResponse(leadType, args.lead_id, outcome.skipped_checks);
    },
    async recalculateCrmLeadQualityScores(_p: unknown, args: { entity_type: string; lead_ids?: string[] | null; external?: boolean | null }, ctx: GraphQLContext) {
      const user = requireRole(ctx, RW);
      const job = await startRecalc(actorOf(user), {
        entity_type: assertLeadType(args.entity_type),
        trigger: 'RECALCULATE',
        external: args.external === true,
        ids: args.lead_ids ?? [],
      });
      return { job_id: job?.job_id ?? null, total: job?.total ?? 0 };
    },
  },
};
