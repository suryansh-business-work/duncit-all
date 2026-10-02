import { z } from 'zod';
import { matches, obj, shape, str, trim } from '@utils/zod-fields';

/** A full web link — the survey pages open it as-is, so it must carry its scheme. */
const WEB_LINK = /^https?:\/\/\S+$/i;

const socialLink = (label: string) =>
  str(
    z
      .string()
      .check(matches(WEB_LINK, { message: `${label} must be a full link starting with https://`, excludeEmptyString: true }))
      .nullable()
      .optional(),
    { transforms: [trim] }
  );

/**
 * Duncit's social links an Onboarding Admin sets. Null is "not sent"; an empty
 * link is "not shown", which is allowed.
 */
export const socialHandlesSchema = obj(
  shape({
    x_url: socialLink('X'),
    instagram_url: socialLink('Instagram'),
    youtube_url: socialLink('YouTube'),
    facebook_url: socialLink('Facebook'),
    website_url: socialLink('Duncit Website'),
  })
);

export type SocialHandlesInput = z.infer<typeof socialHandlesSchema>;
