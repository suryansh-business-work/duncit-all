import { surveyService } from './survey.service';
import type { SurveyKind } from './survey.model';
import type { GraphQLContext } from '@context';
import { requireAuth, requireRole } from '@middleware/rbac';

// Surveys are authored by onboarding managers; responses are read in admin.
const SURVEY_RW = ['SUPER_ADMIN', 'ONBOARDING_MANAGER'];
const ADMIN_READ = ['SUPER_ADMIN', 'CITY_ADMIN', 'ONBOARDING_MANAGER'];

interface ScopeArgs {
  kind: SurveyKind;
  super_category_id?: string | null;
  category_id?: string | null;
  sub_category_id?: string | null;
}

export const surveyResolvers = {
  Query: {
    surveys: (_p: unknown, args: Partial<ScopeArgs> & { search?: string | null }, ctx: GraphQLContext) => {
      requireRole(ctx, SURVEY_RW);
      return surveyService.list(args);
    },
    surveyById: (_p: unknown, args: { id: string }, ctx: GraphQLContext) => {
      requireRole(ctx, SURVEY_RW);
      return surveyService.getById(args.id);
    },
    activeSurvey: (_p: unknown, args: { kind: SurveyKind }, ctx: GraphQLContext) => {
      requireAuth(ctx);
      return surveyService.active(args.kind);
    },
    activeSurveyFor: (_p: unknown, args: ScopeArgs, ctx: GraphQLContext) => {
      requireAuth(ctx);
      return surveyService.activeFor(args);
    },
    mySurveyResponse: (_p: unknown, args: { survey_id: string }, ctx: GraphQLContext) => {
      const user = requireAuth(ctx);
      return surveyService.myResponse(user.id, args.survey_id);
    },
    userSurveyResponses: (_p: unknown, args: { user_id: string }, ctx: GraphQLContext) => {
      requireRole(ctx, ADMIN_READ);
      return surveyService.userResponses(args.user_id);
    },
  },
  Mutation: {
    createSurvey: (_p: unknown, args: { input: any }, ctx: GraphQLContext) => {
      const user = requireRole(ctx, SURVEY_RW);
      return surveyService.create(args.input, user.id);
    },
    updateSurvey: (_p: unknown, args: { id: string; input: any }, ctx: GraphQLContext) => {
      const user = requireRole(ctx, SURVEY_RW);
      return surveyService.update(args.id, args.input, user.id);
    },
    deleteSurvey: (_p: unknown, args: { id: string }, ctx: GraphQLContext) => {
      requireRole(ctx, SURVEY_RW);
      return surveyService.remove(args.id);
    },
    submitSurveyResponse: (_p: unknown, args: { survey_id: string; answers: any[] }, ctx: GraphQLContext) => {
      const user = requireAuth(ctx);
      return surveyService.submit(user.id, args.survey_id, args.answers);
    },
  },
};
