import { Schema, model, type Document } from 'mongoose';

export interface ILocationZone {
  zone_name: string;
  zone_code?: string;
  pincode?: string;
}

export interface ILocation extends Document {
  location_id: string;
  location_name: string;
  country: string;
  country_code: string;
  state: string;
  state_code: string;
  city: string;
  location_image: string;
  location_pincode: string;
  location_zones: ILocationZone[];
  is_active: boolean;
  /** Off: the city is listed in the app but opens its subscribe-for-launch page. */
  is_launched: boolean;
  /** The subscriber goal the subscribe page shows. */
  launch_target: number;
  /** Optional chat.whatsapp.com invite link; '' when unset. */
  whatsapp_group_url: string;
  /** This city's own launch page backdrops; an empty field falls back to the global set on Branding. */
  launch_media: ILaunchPageMedia;
  created_at: Date;
  updated_at: Date;
}

/**
 * The backdrop behind each of the four full-page sections of a city's launch
 * waitlist page — the top (live count), Host, Venue Partner and Club Admin.
 * A section plays its video and draws its image when the video cannot play,
 * or when no video is set. Empty means not set.
 */
export interface ILaunchPageMedia {
  hero_video_url: string;
  hero_image_url: string;
  host_video_url: string;
  host_image_url: string;
  venue_video_url: string;
  venue_image_url: string;
  club_admin_video_url: string;
  club_admin_image_url: string;
}

export const LAUNCH_MEDIA_FIELDS = [
  'hero_video_url',
  'hero_image_url',
  'host_video_url',
  'host_image_url',
  'venue_video_url',
  'venue_image_url',
  'club_admin_video_url',
  'club_admin_image_url',
] as const;

type LaunchMediaLike = Partial<Record<keyof ILaunchPageMedia, string | null>>;

/** The stored object as the API answers it: every field a string, '' when unset. */
export function launchMediaOf(media?: LaunchMediaLike | null): ILaunchPageMedia {
  const out = {} as ILaunchPageMedia;
  for (const field of LAUNCH_MEDIA_FIELDS) out[field] = media?.[field]?.trim() ?? '';
  return out;
}

/** What the page plays: the city's own file where it set one, else the global one. */
export function resolveLaunchMedia(override: ILaunchPageMedia, global: ILaunchPageMedia): ILaunchPageMedia {
  const out = {} as ILaunchPageMedia;
  for (const field of LAUNCH_MEDIA_FIELDS) out[field] = override[field] || global[field];
  return out;
}

/** The launch goal a city gets when an admin sets none. */
export const DEFAULT_LAUNCH_TARGET = 2000;
export const MAX_LAUNCH_TARGET = 1_000_000;

const zoneSchema = new Schema<ILocationZone>(
  {
    zone_name: { type: String, required: true, trim: true },
    zone_code: { type: String, default: '' },
    pincode: { type: String, default: '' },
  },
  { _id: false }
);

const mediaUrl = { type: String, default: '', trim: true };

/** Shared by Location (the override) and Branding (the global set). */
export const launchPageMediaSchema = new Schema<ILaunchPageMedia>(
  {
    hero_video_url: mediaUrl,
    hero_image_url: mediaUrl,
    host_video_url: mediaUrl,
    host_image_url: mediaUrl,
    venue_video_url: mediaUrl,
    venue_image_url: mediaUrl,
    club_admin_video_url: mediaUrl,
    club_admin_image_url: mediaUrl,
  },
  { _id: false }
);

const locationSchema = new Schema<ILocation>(
  {
    location_id: { type: String, required: true, unique: true, lowercase: true, trim: true },
    location_name: { type: String, required: true, trim: true },
    country: { type: String, default: 'India', trim: true },
    country_code: { type: String, default: 'IN', uppercase: true, trim: true },
    state: { type: String, default: '', trim: true },
    state_code: { type: String, default: '', uppercase: true, trim: true },
    city: { type: String, default: '', trim: true },
    location_image: { type: String, required: true },
    location_pincode: { type: String, required: true, trim: true },
    location_zones: { type: [zoneSchema], default: [] },
    is_active: { type: Boolean, default: true },
    is_launched: { type: Boolean, default: true },
    launch_target: { type: Number, default: DEFAULT_LAUNCH_TARGET, min: 1, max: MAX_LAUNCH_TARGET },
    whatsapp_group_url: { type: String, default: '', trim: true },
    launch_media: { type: launchPageMediaSchema, default: () => ({}) },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

export const LocationModel = model<ILocation>('Location', locationSchema);
