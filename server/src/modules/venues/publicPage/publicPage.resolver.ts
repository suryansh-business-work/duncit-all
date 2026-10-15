import type { GraphQLContext } from '@context';
import { hasRole, requireAuth } from '@middleware/rbac';
import { consoleEditors } from '@modules/portals/console-access';
import { publicPageService, type PublicPageKind } from './publicPage.service';
import type { PosterCopy } from './publicPage.poster';

interface PageArgs {
  kind: PublicPageKind;
  ref_id?: string | null;
}

export const publicPageResolvers = {
  Query: {
    myPublicPage: (_p: unknown, args: PageArgs & { days?: number | null }, ctx: GraphQLContext) =>
      publicPageService.insights(requireAuth(ctx), args.kind, args.ref_id, args.days ?? 0),
    myPublicPagePosterPdfBase64: (
      _p: unknown,
      args: PageArgs & { copy: PosterCopy },
      ctx: GraphQLContext,
    ) => publicPageService.posterPdfBase64(requireAuth(ctx), args.kind, args.ref_id, args.copy),
    myVenueTableLabelPdfBase64: (
      _p: unknown,
      args: { venue_id: string; headline: string },
      ctx: GraphQLContext,
    ) => publicPageService.tableLabelPdfBase64(requireAuth(ctx), args.venue_id, args.headline),
    myVenueTableStickersPdfBase64: (
      _p: unknown,
      args: { venue_id: string; headline: string; table_heading: string },
      ctx: GraphQLContext,
    ) =>
      publicPageService.tableStickersPdfBase64(
        requireAuth(ctx),
        args.venue_id,
        { headline: args.headline, tableHeading: args.table_heading },
        // A Venues console editor prints any venue's stickers; everyone else only their own.
        !!ctx.user && hasRole(ctx.user, consoleEditors('VENUE')),
      ),
  },
  Mutation: {
    publishPublicPage: (_p: unknown, args: PageArgs, ctx: GraphQLContext) =>
      publicPageService.publish(requireAuth(ctx), args.kind, args.ref_id),
  },
};
