import { onboardingIntroService, type UpdateOnboardingIntroInput } from './onboardingIntro.service';
import type { GraphQLContext } from '@context';
import { requireAuth, requireRole } from '@middleware/rbac';

// Same authoring role as the surveys these flows also gate on.
const SURVEY_RW = ['SUPER_ADMIN', 'ONBOARDING_MANAGER'];

export const onboardingIntroResolvers = {
  Query: {
    onboardingIntro: (_p: unknown, _args: unknown, ctx: GraphQLContext) => {
      // Read by any signed-in user mid onboarding-flow — same auth bar as
      // activeSurveyFor, not a public/pre-login field.
      requireAuth(ctx);
      return onboardingIntroService.get();
    },
  },
  Mutation: {
    updateOnboardingIntro: (
      _p: unknown,
      args: { input: UpdateOnboardingIntroInput },
      ctx: GraphQLContext,
    ) => {
      requireRole(ctx, SURVEY_RW);
      return onboardingIntroService.update(args.input);
    },
  },
};
