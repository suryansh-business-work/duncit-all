import * as yup from 'yup';

/** A full web link — the survey pages open it as-is, so it must carry its scheme. */
const WEB_LINK = /^https?:\/\/\S+$/i;

const socialLink = (label: string) =>
  yup
    .string()
    .trim()
    .matches(WEB_LINK, { message: `${label} must be a full link starting with https://`, excludeEmptyString: true })
    .nullable();

/**
 * Duncit's social links an Onboarding Admin sets. Null is "not sent"; an empty
 * link is "not shown", which is allowed.
 */
export const socialHandlesSchema = yup.object({
  x_url: socialLink('X'),
  instagram_url: socialLink('Instagram'),
  youtube_url: socialLink('YouTube'),
  facebook_url: socialLink('Facebook'),
  website_url: socialLink('Duncit Website'),
});

export type SocialHandlesInput = yup.InferType<typeof socialHandlesSchema>;
