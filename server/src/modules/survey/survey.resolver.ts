import { surveyService } from './survey.service';
import type { SurveyKind } from './survey.model';
import type { GraphQLContext } from '@context';
import { requireAuth, requireRole } from '@middleware/rbac';

// Surveys are authored by onboarding managers; responses are read in admin.
const SURVEY_RW = ['SUPER_ADMIN', 'ONBOARDING_MANAGER'];
const ADMIN_READ = ['SUPER_ADMIN', 'CITY_ADMIN', 'ONBOARDING_MANAGER'];

export const surveyResolvers = {
  Query: {
    survey: (_p: unknown, args: { kind: SurveyKind }, ctx: GraphQLContext) => {
      requireRole(ctx, SURVEY_RW);
      return surveyService.get(args.kind);
    },
    activeSurvey: (_p: unknown, args: { kind: SurveyKind }, ctx: GraphQLContext) => {
      requireAuth(ctx);
      return surveyService.active(args.kind);
    },
    mySurveyResponse: (_p: unknown, args: { kind: SurveyKind }, ctx: GraphQLContext) => {
      const user = requireAuth(ctx);
      return surveyService.myResponse(user.id, args.kind);
    },
    userSurveyResponses: (_p: unknown, args: { user_id: string }, ctx: GraphQLContext) => {
      requireRole(ctx, ADMIN_READ);
      return surveyService.userResponses(args.user_id);
    },
  },
  Mutation: {
    upsertSurvey: (_p: unknown, args: { kind: SurveyKind; input: any }, ctx: GraphQLContext) => {
      const user = requireRole(ctx, SURVEY_RW);
      return surveyService.upsert(args.kind, args.input, user.id);
    },
    submitSurveyResponse: (_p: unknown, args: { kind: SurveyKind; answers: any[] }, ctx: GraphQLContext) => {
      const user = requireAuth(ctx);
      return surveyService.submit(user.id, args.kind, args.answers);
    },
  },
};
