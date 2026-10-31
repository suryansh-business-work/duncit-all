import { GraphQLError } from 'graphql';
import { Types } from 'mongoose';
import { VenueModel } from '@modules/venues/venue/venue.model';
import { HostModel } from '@modules/venues/host/host.model';
import { UserModel } from '@modules/access/user/user.model';
import { venueService } from '@modules/venues/venue/venue.service';
import { hostService } from '@modules/venues/host/host.service';
import { applyBannerKitInput, type BannerKitInput } from './bannerKit.rules';
import { toStoredBannerKit, type BannerKitSuggestions } from './bannerKit.pub';

const fail = (code: string, message: string): never => {
  throw new GraphQLError(message, { extensions: { code } });
};

const assertId = (id: string, what: string) => {
  if (!Types.ObjectId.isValid(id)) fail('BAD_USER_INPUT', `Invalid ${what} id`);
};

/** The slice of a venue its kit suggestions are read from. */
interface VenueMedia {
  cover_image_url?: string | null;
  gallery?: readonly string[] | null;
}

/** The slice of a host its kit suggestions are read from. */
interface HostMedia {
  user_id?: string | null;
  passport_photo_url?: string | null;
}

/**
 * Who edits a banner kit is who edits the record it sits on: a venue's owner or
 * a Venues console editor; the host themself or a Hosts console editor
 * (`console-access.ts`). The resolver decides `isEditor`; ownership is checked
 * here against the stored row, never against anything the caller sent.
 *
 * Saved with `save()`, so the model's entity change log records every field
 * that moved, attributed to the owner or to staff (attachEntityAudit).
 */
export const bannerKitService = {
  async updateVenueKit(userId: string, isEditor: boolean, venueId: string, input: BannerKitInput) {
    assertId(venueId, 'venue');
    const venue = await VenueModel.findById(venueId);
    if (!venue) return fail('NOT_FOUND', 'Venue not found');
    if (!isEditor && String(venue.owner_user_id) !== String(userId)) fail('FORBIDDEN', 'Not your venue');
    venue.set('banner_kit', applyBannerKitInput(toStoredBannerKit(venue.banner_kit), input));
    await venue.save();
    return venueService.getById(String(venue._id));
  },

  async updateHostKit(userId: string, isEditor: boolean, hostId: string, input: BannerKitInput) {
    assertId(hostId, 'host');
    const host = await HostModel.findById(hostId);
    if (!host) return fail('NOT_FOUND', 'Host not found');
    if (!isEditor && String(host.user_id) !== String(userId)) fail('FORBIDDEN', 'Not your host profile');
    host.set('banner_kit', applyBannerKitInput(toStoredBannerKit(host.banner_kit), input));
    await host.save();
    // The plain host row (no commission figures): a host saving their own kit
    // reads back nothing a hosts-console reader alone may see.
    return hostService.getByUser(String(host.user_id));
  },

  /** A venue's cover image is its fallback logo; the cover and the gallery are its photos. */
  venueSuggestions(venue: VenueMedia): BannerKitSuggestions {
    const cover = venue.cover_image_url ?? '';
    return { logo: cover, photos: [cover, ...(venue.gallery ?? [])] };
  },

  /** A host's profile photo, then the photo on their application, are their fallback logo and portraits. */
  async hostSuggestions(host: HostMedia): Promise<BannerKitSuggestions> {
    const user =
      host.user_id && Types.ObjectId.isValid(host.user_id)
        ? await UserModel.findById(host.user_id)
            .select('profile.profile_photo')
            .lean<{ profile?: { profile_photo?: string | null } | null }>()
        : null;
    const photos = [user?.profile?.profile_photo ?? '', host.passport_photo_url ?? ''];
    return { logo: photos.find(Boolean) ?? '', photos };
  },
};
