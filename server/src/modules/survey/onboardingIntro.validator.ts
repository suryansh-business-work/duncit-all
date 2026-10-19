import { z } from 'zod';
import { matches, obj, shape, str, trim } from '@utils/zod-fields';

/** A full web link — the survey pages open it as-is, so it must carry its scheme. */
const WEB_LINK = /^https?:\/\/\S+$/i;

/** An optional full web link: null is "not sent", an empty link is allowed. */
const webLink = (message: string) =>
  str(
    z
      .string()
      .check(matches(WEB_LINK, { message, excludeEmptyString: true }))
      .nullable()
      .optional(),
    { transforms: [trim] }
  );

const socialLink = (label: string) => webLink(`${label} must be a full link starting with https://`);

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

const imageLink = (label: string) => webLink(`${label} image must be a full link starting with https://`);

/**
 * The Earn with Duncit card images an Onboarding Admin sets. Null is "not
 * sent"; an empty link falls back to Duncit's default image.
 */
export const earnCardImagesSchema = obj(
  shape({
    host: imageLink('Host'),
    venue: imageLink('Venue'),
    ecomm: imageLink('E-commerce'),
    club: imageLink('Club Admin'),
    freelancer: imageLink('Freelancer'),
  })
);

export type EarnCardImagesInput = z.infer<typeof earnCardImagesSchema>;
