import { leadSurveyService } from './leadSurvey.service';
import type { LeadSurveyEntity } from './leadSurveyEntry.model';
import { CRM_RW } from '@modules/crm/crm/crm.constants';
import type { GraphQLContext } from '@context';
import { requireRole } from '@middleware/rbac';

const RW = [...CRM_RW];

export const leadSurveyResolvers = {
  Query: {
    leadSurvey: (
      _p: unknown,
      args: { entity: LeadSurveyEntity; lead_id: string; category_id?: string | null; sub_category_id?: string | null },
      ctx: GraphQLContext
    ) => {
      requireRole(ctx, RW);
      return leadSurveyService.forLead(args.entity, args.lead_id, {
        category_id: args.category_id ?? null,
        sub_category_id: args.sub_category_id ?? null,
      });
    },
    // Public — the share link is the capability; no auth.
    leadSurveyByToken: (_p: unknown, args: { token: string }) => leadSurveyService.byToken(args.token),
  },
  Mutation: {
    saveLeadSurveyResponse: (
      _p: unknown,
      args: { entity: LeadSurveyEntity; lead_id: string; survey_id: string; answers: any[] },
      ctx: GraphQLContext
    ) => {
      const user = requireRole(ctx, RW);
      return leadSurveyService.saveManual(args.entity, args.lead_id, args.survey_id, args.answers, user.id);
    },
    generateLeadSurveyLink: (
      _p: unknown,
      args: { entity: LeadSurveyEntity; lead_id: string; survey_id: string },
      ctx: GraphQLContext
    ) => {
      const user = requireRole(ctx, RW);
      return leadSurveyService.generateLink(args.entity, args.lead_id, args.survey_id, user.id);
    },
    revokeLeadSurveyLink: (_p: unknown, args: { entry_id: string }, ctx: GraphQLContext) => {
      requireRole(ctx, RW);
      return leadSurveyService.revokeLink(args.entry_id);
    },
    deleteLeadSurveyEntry: (_p: unknown, args: { entry_id: string }, ctx: GraphQLContext) => {
      requireRole(ctx, RW);
      return leadSurveyService.deleteEntry(args.entry_id);
    },
    // Public — submit via share token; no auth.
    submitLeadSurveyByToken: (_p: unknown, args: { token: string; answers: any[] }) =>
      leadSurveyService.submitByToken(args.token, args.answers),
  },
};
