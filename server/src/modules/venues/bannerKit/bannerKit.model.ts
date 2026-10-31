import { Schema } from 'mongoose';

/**
 * A venue's or a host's banner kit — what the pod promotion banners are made
 * from: a logo, the Instagram account Duncit invites as a collaborator, photos
 * (a venue's space, a host's portraits), a host's past-event photos, a tagline,
 * a short bio and a brand colour.
 *
 * One sub-document shape on both models, so the banner engine reads a venue's
 * kit and a host's kit the same way.
 */
export interface IBannerKitPhoto {
  url: string;
  caption: string;
}

export interface IBannerKit {
  logo_url: string;
  /** Lowercase, without the `@` or the instagram.com address around it. */
  instagram_handle: string;
  photos: IBannerKitPhoto[];
  event_photos: IBannerKitPhoto[];
  tagline: string;
  bio: string;
  /** `#rrggbb`, or '' for the banner's own colours. */
  brand_color: string;
  /** Whether Duncit may invite `instagram_handle` as a collaborator on the pod's post. */
  collab_opt_in: boolean;
}

const bannerKitPhotoSchema = new Schema<IBannerKitPhoto>(
  {
    url: { type: String, default: '' },
    caption: { type: String, default: '' },
  },
  { _id: false }
);

export const bannerKitSchema = new Schema<IBannerKit>(
  {
    logo_url: { type: String, default: '' },
    instagram_handle: { type: String, default: '' },
    photos: { type: [bannerKitPhotoSchema], default: [] },
    event_photos: { type: [bannerKitPhotoSchema], default: [] },
    tagline: { type: String, default: '' },
    bio: { type: String, default: '' },
    brand_color: { type: String, default: '' },
    collab_opt_in: { type: Boolean, default: true },
  },
  { _id: false }
);

/** A kit nobody has filled in — what an old venue or host row reads as. */
export const blankBannerKit = (): IBannerKit => ({
  logo_url: '',
  instagram_handle: '',
  photos: [],
  event_photos: [],
  tagline: '',
  bio: '',
  brand_color: '',
  collab_opt_in: true,
});
