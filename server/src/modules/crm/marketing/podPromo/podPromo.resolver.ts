import type { GraphQLContext } from '@context';
import { requireRole } from '@middleware/rbac';
import type { TableQueryInput } from '@utils/table-query';
import { podPromoService } from './podPromo.service';
import { EDIT_ROLES, MANAGE_ROLES, READ_ROLES, type BannerSize, type BannerStyle, type SlideKind } from './podPromo.types';

type Ctx = GraphQLContext;

interface BannerArgs {
  pod_id: string;
  style?: BannerStyle | null;
  size?: BannerSize | null;
}

/**
 * Publishing › Pod promotions. Everyone in marketing reads; editors may also
 * preview and make banners (nothing is posted); managers change the settings
 * and promote, re-render or cancel — the actions that put something on the
 * company's accounts.
 */
export const podPromoResolvers = {
  Query: {
    podPromoSettings: (_p: unknown, _a: unknown, ctx: Ctx) => {
      requireRole(ctx, READ_ROLES);
      return podPromoService.settings();
    },
    podPromosTable: (_p: unknown, args: { query?: TableQueryInput | null }, ctx: Ctx) => {
      requireRole(ctx, READ_ROLES);
      return podPromoService.table(args.query);
    },
    podPromo: (_p: unknown, args: { id: string }, ctx: Ctx) => {
      requireRole(ctx, READ_ROLES);
      return podPromoService.get(args.id);
    },
    podPromoSummary: (_p: unknown, _a: unknown, ctx: Ctx) => {
      requireRole(ctx, READ_ROLES);
      return podPromoService.summary();
    },
    podPromoCandidates: (_p: unknown, args: { search?: string | null }, ctx: Ctx) => {
      requireRole(ctx, READ_ROLES);
      return podPromoService.candidates(args.search);
    },
  },
  Mutation: {
    updatePodPromoSettings: (_p: unknown, args: { input: unknown }, ctx: Ctx) => {
      const user = requireRole(ctx, MANAGE_ROLES);
      return podPromoService.saveSettings(args.input, user.id);
    },
    previewPodPromo: (_p: unknown, args: BannerArgs, ctx: Ctx) => podPromoService.preview(args, requireRole(ctx, EDIT_ROLES)),
    generatePodBanners: (_p: unknown, args: BannerArgs, ctx: Ctx) => podPromoService.generateBanners(args, requireRole(ctx, EDIT_ROLES)),
    regeneratePodBannerSlide: (_p: unknown, args: BannerArgs & { kind: SlideKind }, ctx: Ctx) =>
      podPromoService.regenerateSlide(args, requireRole(ctx, EDIT_ROLES)),
    createPodPromo: (_p: unknown, args: { pod_id: string }, ctx: Ctx) => podPromoService.promote({ pod_id: args.pod_id }, requireRole(ctx, MANAGE_ROLES)),
    schedulePodPromo: (
      _p: unknown,
      args: { pod_id: string; at?: string | null; account_ids?: string[] | null; collaborators?: string[] | null; style?: BannerStyle | null },
      ctx: Ctx
    ) => podPromoService.promote(args, requireRole(ctx, MANAGE_ROLES)),
    regeneratePodPromoBanner: (_p: unknown, args: { id: string; style?: BannerStyle | null }, ctx: Ctx) =>
      podPromoService.regenerate(args.id, args.style, requireRole(ctx, MANAGE_ROLES)),
    cancelPodPromo: (_p: unknown, args: { id: string }, ctx: Ctx) => {
      requireRole(ctx, MANAGE_ROLES);
      return podPromoService.cancel(args.id);
    },
  },
};
