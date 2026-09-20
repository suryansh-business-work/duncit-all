import * as yup from 'yup';
import { MAX_LAUNCH_TARGET } from './location.model';

/** A WhatsApp group invite link — the only kind the subscribe page opens. */
const WHATSAPP_GROUP_URL = /^https:\/\/chat\.whatsapp\.com\/\S+$/;

/** A launch page backdrop address — the file the media picker stored — or empty. */
const MEDIA_URL = /^https?:\/\/\S+$/;
const mediaUrl = () =>
  yup
    .string()
    .trim()
    .matches(MEDIA_URL, { message: 'Launch page media must be a full web address', excludeEmptyString: true })
    .nullable();

/** The per-section backdrops, on a city (its override) and on Branding (the global set). */
export const launchMediaSchema = yup.object({
  hero_video_url: mediaUrl(),
  hero_image_url: mediaUrl(),
  host_video_url: mediaUrl(),
  host_image_url: mediaUrl(),
  venue_video_url: mediaUrl(),
  venue_image_url: mediaUrl(),
  club_admin_video_url: mediaUrl(),
  club_admin_image_url: mediaUrl(),
});

export type LaunchMediaInput = yup.InferType<typeof launchMediaSchema>;

/**
 * The launch fields an admin sets on a city, on create and on update. Null is
 * "not sent" (GraphQL passes an explicit null for a cleared optional input);
 * an empty link is "no group", which is allowed.
 */
export const locationLaunchSchema = yup.object({
  is_active: yup.boolean().nullable(),
  is_launched: yup.boolean().nullable(),
  launch_target: yup
    .number()
    .integer('Launch target must be a whole number')
    .min(1, 'Launch target must be at least 1')
    .max(MAX_LAUNCH_TARGET, `Launch target can be at most ${MAX_LAUNCH_TARGET}`)
    .nullable(),
  whatsapp_group_url: yup
    .string()
    .trim()
    .matches(WHATSAPP_GROUP_URL, {
      message: 'WhatsApp group link must start with https://chat.whatsapp.com/',
      excludeEmptyString: true,
    })
    .nullable(),
  launch_media: launchMediaSchema.nullable().default(undefined),
});

export type LocationLaunchInput = yup.InferType<typeof locationLaunchSchema>;
