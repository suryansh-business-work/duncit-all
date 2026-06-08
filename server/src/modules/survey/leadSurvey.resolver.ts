import { leadSurveyService, type LeadSurveyEntity } from './leadSurvey.service';
import { CRM_RW } from '@modules/crm/crm/crm.constants';
import type { GraphQLContext } from '@context';
import { requireRole } from '@middleware/rbac';

const RW = [...CRM_RW];

export const leadSurveyResolvers = {
  Query: {
    leadSurvey: (_p: unknown, args: { entity: LeadSurveyEntity; lead_id: string }, ctx: GraphQLContext) => {
      requireRole(ctx, RW);
      return leadSurveyService.forLead(args.entity, args.lead_id);
    },
  },
  Mutation: {
    saveLeadSurveyResponse: (
      _p: unknown,
      args: { entity: LeadSurveyEntity; lead_id: string; survey_id: string; answers: any[] },
      ctx: GraphQLContext
    ) => {
      const user = requireRole(ctx, RW);
      return leadSurveyService.save(args.entity, args.lead_id, args.survey_id, args.answers, user.id);
    },
  },
};
