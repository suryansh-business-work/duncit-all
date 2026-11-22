import type { GraphQLContext } from '@context';
import { requireRole } from '@middleware/rbac';
import type { TableQueryInput } from '@utils/table-query';
import { CRM_RW } from '@modules/crm/crm/crm.constants';
import { assertLeadType } from '@modules/crm/leadQuality/leadQualityConfig.service';
import { qualityActor, viaOf } from '@modules/crm/leadQuality/leadQuality.resolver';
import type { QualityResult } from '@modules/crm/leadQuality/leadQuality.rules';
import type { EvidenceDecision } from '@modules/crm/leadQuality/leadQuality.service';
import type { CandidateInput } from './leadResearch.candidate';
import { leadDiscoveryService, type StartDiscoveryInput } from './leadResearch.discovery';
import type { LeadCandidateDoc } from './leadResearch.model';
import { leadResearchService } from './leadResearch.service';

/**
 * CRM › Lead Research API — CRM staff only, for the console, MCP and Ask
 * Duncit alike. Adding a candidate to the CRM goes through
 * approveCrmLeadCandidates, which MCP refuses to run until the person confirms.
 */

const RW = [...CRM_RW];
const iso = (value: unknown): string | null => (value instanceof Date ? value.toISOString() : null);

/** A candidate as the API returns it: dates as ISO, evidence named like a lead's, what is still unverified. */
export function pubCandidate(doc: LeadCandidateDoc | null) {
  if (!doc) return null;
  const result = doc.result as QualityResult | null;
  const missing = (result?.criteria ?? []).flatMap((criterion) =>
    criterion.items.filter((item) => item.status === 'PENDING').map((item) => (item.sub_key ? `${criterion.name} › ${item.name}` : criterion.name))
  );
  return {
    ...doc,
    id: String(doc._id),
    instagram_url: doc.instagram_handle ? `https://www.instagram.com/${doc.instagram_handle}/` : '',
    evidence: (doc.items ?? []).map((item) => ({ ...item, decided_at: iso(item.decided_at) ?? '' })),
    missing_evidence: missing,
    decided_at: iso(doc.decided_at),
    created_at: iso(doc.created_at) ?? '',
    updated_at: iso(doc.updated_at) ?? '',
  };
}

type DiscoveryView = Awaited<ReturnType<typeof leadDiscoveryService.get>>;
const pubDiscovery = (view: DiscoveryView) => ({ ...view, candidates: view.candidates.map(pubCandidate) });

export const leadResearchResolvers = {
  Query: {
    async crmLeadCandidatesTable(_p: unknown, args: { query?: TableQueryInput | null }, ctx: GraphQLContext) {
      requireRole(ctx, RW);
      const { docs, total, page, page_size } = await leadResearchService.table(args.query);
      return { rows: docs.map(pubCandidate), total, page, page_size };
    },
    async crmLeadCandidate(_p: unknown, args: { id: string }, ctx: GraphQLContext) {
      requireRole(ctx, RW);
      return pubCandidate(await leadResearchService.candidate(args.id));
    },
    async crmLeadDiscoveryJob(_p: unknown, args: { id: string; candidate_limit?: number | null }, ctx: GraphQLContext) {
      const user = requireRole(ctx, RW);
      return pubDiscovery(await leadDiscoveryService.get(user, args.id, args.candidate_limit));
    },
    async crmLeadDiscoveryJobs(_p: unknown, args: { limit?: number | null }, ctx: GraphQLContext) {
      requireRole(ctx, RW);
      return (await leadDiscoveryService.list(args.limit)).map(pubDiscovery);
    },
    checkCrmLeadDuplicates(_p: unknown, args: { lead_type: string; input: CandidateInput }, ctx: GraphQLContext) {
      requireRole(ctx, RW);
      return leadResearchService.duplicateCheck(assertLeadType(args.lead_type), args.input);
    },
  },
  Mutation: {
    async startCrmLeadDiscovery(_p: unknown, args: { input: StartDiscoveryInput }, ctx: GraphQLContext) {
      const user = requireRole(ctx, RW);
      return pubDiscovery(await leadDiscoveryService.start(user, { ...args.input, lead_type: assertLeadType(args.input?.lead_type) }));
    },
    async retryCrmLeadDiscovery(_p: unknown, args: { id: string }, ctx: GraphQLContext) {
      const user = requireRole(ctx, RW);
      return pubDiscovery(await leadDiscoveryService.retry(user, args.id));
    },
    async cancelCrmLeadDiscovery(_p: unknown, args: { id: string }, ctx: GraphQLContext) {
      const user = requireRole(ctx, RW);
      return pubDiscovery(await leadDiscoveryService.cancel(user, args.id));
    },
    async saveCrmLeadCandidates(_p: unknown, args: { lead_type: string; candidates: CandidateInput[]; external_checks?: boolean | null }, ctx: GraphQLContext) {
      const user = requireRole(ctx, RW);
      const via = viaOf(ctx);
      const report = await leadResearchService.saveCandidates(assertLeadType(args.lead_type), args.candidates ?? [], await qualityActor(user), {
        origin: via === 'MCP' ? 'MCP' : 'DISCOVERY',
        via,
        external: args.external_checks === true,
      });
      return { ...report, saved: report.saved.map(pubCandidate), duplicates: report.duplicates.map(pubCandidate) };
    },
    async verifyCrmLeadCandidateEvidence(_p: unknown, args: { id: string; decisions: EvidenceDecision[]; external_checks?: boolean | null }, ctx: GraphQLContext) {
      const user = requireRole(ctx, RW);
      return pubCandidate(await leadResearchService.verifyCandidate(args.id, args.decisions ?? [], await qualityActor(user), viaOf(ctx), args.external_checks === true));
    },
    async approveCrmLeadCandidates(_p: unknown, args: { ids: string[]; allow_unqualified?: boolean | null; note?: string | null }, ctx: GraphQLContext) {
      const user = requireRole(ctx, RW);
      return leadResearchService.approveCandidates(args.ids ?? [], await qualityActor(user), { allow_unqualified: args.allow_unqualified === true, note: args.note });
    },
    async rejectCrmLeadCandidates(_p: unknown, args: { ids: string[]; note?: string | null }, ctx: GraphQLContext) {
      const user = requireRole(ctx, RW);
      return leadResearchService.rejectCandidates(args.ids ?? [], await qualityActor(user), args.note);
    },
  },
};
