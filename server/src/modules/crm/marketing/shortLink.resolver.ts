import type { GraphQLContext } from '@context';
import { requireRole } from '@middleware/rbac';
import { shortLinkService } from './shortLink.service';
import { shortLinkJourneyService } from './shortLinkJourney.service';
import type { JourneyStep } from './shortLinkClick.model';

/** Same gate as the rest of the marketing console. */
const ADMIN_ROLES = ['SUPER_ADMIN', 'CITY_ADMIN', 'MARKETING_MANAGER'];

export const shortLinkResolvers = {
  Query: {
    shortLinkOptions: (_p: unknown, _a: unknown, ctx: GraphQLContext) => {
      requireRole(ctx, ADMIN_ROLES);
      return shortLinkService.options();
    },
    shortLinksTable: (_p: unknown, args: { query?: any }, ctx: GraphQLContext) => {
      requireRole(ctx, ADMIN_ROLES);
      return shortLinkService.table(args.query);
    },
    shortLink: (_p: unknown, args: { id: string }, ctx: GraphQLContext) => {
      requireRole(ctx, ADMIN_ROLES);
      return shortLinkService.byId(args.id);
    },
    shortLinkQr: (_p: unknown, args: { id: string }, ctx: GraphQLContext) => {
      requireRole(ctx, ADMIN_ROLES);
      return shortLinkService.qrDataUrl(args.id);
    },
    shortLinkStats: (_p: unknown, args: { id: string }, ctx: GraphQLContext) => {
      requireRole(ctx, ADMIN_ROLES);
      return shortLinkService.stats(args.id);
    },
    shortLinkClicks: (
      _p: unknown,
      args: { id: string; query?: any },
      ctx: GraphQLContext
    ) => {
      requireRole(ctx, ADMIN_ROLES);
      return shortLinkService.clicks(args.id, args.query);
    },
    shortLinkFunnel: (_p: unknown, args: { id: string }, ctx: GraphQLContext) => {
      requireRole(ctx, ADMIN_ROLES);
      return shortLinkJourneyService.funnel(args.id);
    },
    shortLinkJourneys: (
      _p: unknown,
      args: { id: string; query?: any },
      ctx: GraphQLContext
    ) => {
      requireRole(ctx, ADMIN_ROLES);
      return shortLinkJourneyService.journeys(args.id, args.query);
    },
  },
  Mutation: {
    // Deliberately ungated: most of this funnel happens before anyone signs
    // in. The worst a forged call can do is inflate one link's own numbers,
    // and requiring auth would make the anonymous half unmeasurable.
    recordShortLinkJourney: (
      _p: unknown,
      args: { click_id: string; step: JourneyStep },
      ctx: GraphQLContext
    ) => shortLinkJourneyService.recordStep(args.click_id, args.step, ctx.user?.id ?? null),
    createShortLink: (_p: unknown, args: { input: any }, ctx: GraphQLContext) => {
      // requireRole returns the authenticated user it just proved, so there is
      // no need to re-guard ctx.user for the author id.
      const user = requireRole(ctx, ADMIN_ROLES);
      return shortLinkService.create(args.input, user.id);
    },
    setShortLinkActive: (
      _p: unknown,
      args: { id: string; is_active: boolean },
      ctx: GraphQLContext
    ) => {
      requireRole(ctx, ADMIN_ROLES);
      return shortLinkService.setActive(args.id, args.is_active);
    },
    deleteShortLink: (_p: unknown, args: { id: string }, ctx: GraphQLContext) => {
      requireRole(ctx, ADMIN_ROLES);
      return shortLinkService.remove(args.id);
    },
  },
};
