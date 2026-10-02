import { z } from 'zod';
import { bool, finite, gte, int, lte, matches, num, obj, shape, str, trim } from '@utils/zod-fields';
import { MAX_LAUNCH_TARGET } from './location.model';

/** A WhatsApp group invite link — the only kind the subscribe page opens. */
const WHATSAPP_GROUP_URL = /^https:\/\/chat\.whatsapp\.com\/\S+$/;

/** A launch page backdrop address — the file the media picker stored — or empty. */
const MEDIA_URL = /^https?:\/\/\S+$/;
const mediaUrl = () =>
  str(
    z
      .string()
      .check(matches(MEDIA_URL, { message: 'Launch page media must be a full web address', excludeEmptyString: true }))
      .nullable()
      .optional(),
    { transforms: [trim] }
  );

const launchMediaShape = shape({
  hero_video_url: mediaUrl(),
  hero_image_url: mediaUrl(),
  host_video_url: mediaUrl(),
  host_image_url: mediaUrl(),
  venue_video_url: mediaUrl(),
  venue_image_url: mediaUrl(),
  club_admin_video_url: mediaUrl(),
  club_admin_image_url: mediaUrl(),
});

/** The per-section backdrops, on a city (its override) and on Branding (the global set). */
export const launchMediaSchema = obj(launchMediaShape);

export type LaunchMediaInput = z.infer<typeof launchMediaSchema>;

/**
 * The launch fields an admin sets on a city, on create and on update. Null is
 * "not sent" (GraphQL passes an explicit null for a cleared optional input);
 * an empty link is "no group", which is allowed.
 */
export const locationLaunchSchema = obj(
  shape({
    is_active: bool(z.boolean().nullable().optional()),
    is_launched: bool(z.boolean().nullable().optional()),
    launch_target: num(
      finite()
        .check(
          int('Launch target must be a whole number'),
          gte(1, 'Launch target must be at least 1'),
          lte(MAX_LAUNCH_TARGET, `Launch target can be at most ${MAX_LAUNCH_TARGET}`)
        )
        .nullable()
        .optional()
    ),
    whatsapp_group_url: str(
      z
        .string()
        .check(
          matches(WHATSAPP_GROUP_URL, {
            message: 'WhatsApp group link must start with https://chat.whatsapp.com/',
            excludeEmptyString: true,
          })
        )
        .nullable()
        .optional(),
      { transforms: [trim] }
    ),
    launch_media: obj(launchMediaShape.nullable().optional(), { default: undefined }),
  })
);

export type LocationLaunchInput = z.infer<typeof locationLaunchSchema>;
