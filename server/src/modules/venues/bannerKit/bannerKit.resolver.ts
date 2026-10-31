import type { GraphQLContext } from '@context';
import { hasRole, requireAuth } from '@middleware/rbac';
import { consoleEditors } from '@modules/portals/console-access';
import { bannerKitService } from './bannerKit.service';
import { toBannerKitPub } from './bannerKit.pub';
import type { IBannerKit } from './bannerKit.model';
import type { BannerKitInput } from './bannerKit.rules';

/** Whoever may edit the venue's own details may edit its kit; same for a host. */
const VENUE_EDIT = consoleEditors('VENUE');
const HOST_EDIT = consoleEditors('HOST');

interface VenueParent {
  banner_kit?: Partial<IBannerKit> | null;
  cover_image_url?: string | null;
  gallery?: string[] | null;
}

interface HostParent {
  banner_kit?: Partial<IBannerKit> | null;
  user_id?: string | null;
  passport_photo_url?: string | null;
}

export const bannerKitResolvers = {
  Venue: {
    banner_kit: (venue: VenueParent) => toBannerKitPub(venue.banner_kit, bannerKitService.venueSuggestions(venue)),
  },
  Host: {
    banner_kit: async (host: HostParent) =>
      toBannerKitPub(host.banner_kit, await bannerKitService.hostSuggestions(host)),
  },
  Mutation: {
    updateVenueBannerKit: (
      _p: unknown,
      args: { venue_id: string; input: BannerKitInput },
      ctx: GraphQLContext
    ) => {
      const user = requireAuth(ctx);
      return bannerKitService.updateVenueKit(user.id, hasRole(user, VENUE_EDIT), args.venue_id, args.input);
    },
    updateHostBannerKit: (
      _p: unknown,
      args: { host_id: string; input: BannerKitInput },
      ctx: GraphQLContext
    ) => {
      const user = requireAuth(ctx);
      return bannerKitService.updateHostKit(user.id, hasRole(user, HOST_EDIT), args.host_id, args.input);
    },
  },
};
