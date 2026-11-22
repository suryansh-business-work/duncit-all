import type { GraphQLContext } from '@context';
import { hasRole, requireRole } from '@middleware/rbac';
import { requireHuman, type CaptchaCarrier } from '@modules/platform/captcha/captcha.guard';
import { consoleEditors } from '@modules/portals/console-access';
import type { TableQueryInput } from '@utils/table-query';
import { venueKitOtp } from './venueKit.otp';
import { venueKitService } from './venueKit.service';
import type { VenueKitSource } from './venueKit.model';

/** Who reads and works the interest list: the Venues console's own audience. */
const VENUES_TEAM = consoleEditors('VENUE');

/** The plan is national pricing — one owner. */
const OFFER_EDITORS = ['SUPER_ADMIN'];

interface InputArgs<T = Record<string, unknown>> {
  input: T;
}

/** The venues team submitting from its console; anyone else (a website visitor) is the website. */
const sourceOf = (ctx: GraphQLContext): VenueKitSource =>
  ctx.user && hasRole(ctx.user, VENUES_TEAM) ? 'VENUES_PORTAL' : 'WEBSITE';

export const venueKitResolvers = {
  Query: {
    venueKitOffer: () => venueKitService.offer(),

    venueKitInterestsTable: (_p: unknown, args: { query?: TableQueryInput | null }, ctx: GraphQLContext) => {
      requireRole(ctx, VENUES_TEAM);
      return venueKitService.table(args.query);
    },

    venueKitInterestSummary: (_p: unknown, _a: unknown, ctx: GraphQLContext) => {
      requireRole(ctx, VENUES_TEAM);
      return venueKitService.summary();
    },
  },

  Mutation: {
    requestVenueKitEmailOtp: (_p: unknown, args: InputArgs<CaptchaCarrier>, ctx: GraphQLContext) => {
      requireHuman(ctx, args.input);
      return venueKitOtp.requestEmail(args.input, ctx.user?.id ?? null);
    },

    verifyVenueKitEmailOtp: (_p: unknown, args: InputArgs) => venueKitOtp.verifyEmail(args.input),

    requestVenueKitPhoneOtp: (_p: unknown, args: InputArgs, ctx: GraphQLContext) =>
      venueKitOtp.requestPhone(args.input, ctx.user?.id ?? null),

    verifyVenueKitPhoneOtp: (_p: unknown, args: InputArgs) => venueKitOtp.verifyPhone(args.input),

    submitVenueKitInterest: (_p: unknown, args: InputArgs, ctx: GraphQLContext) =>
      venueKitService.submit(args.input, { source: sourceOf(ctx) }),

    setVenueKitInterestStatus: (_p: unknown, args: InputArgs, ctx: GraphQLContext) => {
      requireRole(ctx, VENUES_TEAM);
      return venueKitService.setStatus(args.input);
    },

    updateVenueKitOffer: (_p: unknown, args: InputArgs, ctx: GraphQLContext) => {
      requireRole(ctx, OFFER_EDITORS);
      return venueKitService.updateOffer(args.input);
    },
  },
};
