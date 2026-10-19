import { z } from 'zod';
import { webLink } from '../../settings/onboarding-intro-settings';

/** One image link per Earn card, keyed by the card's iconKey. Empty = Duncit's default. */
export const earnCardImagesSchema = z.object({
  host: webLink,
  venue: webLink,
  ecomm: webLink,
  club: webLink,
  freelancer: webLink,
});

export type EarnCardImagesValues = z.infer<typeof earnCardImagesSchema>;

export const BLANK_EARN_CARD_IMAGES: EarnCardImagesValues = {
  host: '',
  venue: '',
  ecomm: '',
  club: '',
  freelancer: '',
};
