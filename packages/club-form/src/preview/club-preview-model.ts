import { linesToMedia } from '../build-input';
import type { ClubFaqValue, ClubFormValues } from '../types';

export interface ClubPreviewMedia {
  url: string;
  type: string;
}

/** Names the form only holds as ids — resolved by the caller from the shared
 * category and location datasets. */
export interface ClubPreviewLabels {
  categoryText: string;
  placeText: string;
}

/**
 * Everything the two preview surfaces render, derived ONCE from the live form
 * values so the list card and the club page can never disagree about a field.
 */
export interface ClubPreviewModel {
  name: string;
  description: string;
  media: ClubPreviewMedia[];
  moments: ClubPreviewMedia[];
  categoryText: string;
  placeText: string;
  isVerified: boolean;
  whoWeAre: string[];
  whatWeDo: string[];
  perks: string[];
  values: string[];
  faqs: ClubFaqValue[];
  communityLink: string;
  groupLink: string;
}

/** A club with no name yet still needs a headline in the preview. */
const UNNAMED = 'Untitled club';

const cleaned = (items: string[]): string[] => items.map((item) => item.trim()).filter(Boolean);

/**
 * The one derivation both preview surfaces read. Pure so the portals can render
 * it without a network round-trip.
 */
export function buildClubPreview(
  values: ClubFormValues,
  labels: ClubPreviewLabels,
): ClubPreviewModel {
  return {
    name: values.club_name.trim() || UNNAMED,
    description: values.club_description.trim(),
    media: linesToMedia(values.feature_text),
    moments: linesToMedia(values.moments_text),
    categoryText: labels.categoryText,
    placeText: labels.placeText,
    isVerified: values.is_verified,
    whoWeAre: cleaned(values.who_we_are),
    whatWeDo: cleaned(values.what_we_do),
    perks: cleaned(values.perks),
    values: cleaned(values.values),
    faqs: values.faqs.filter((faq) => faq.question.trim()),
    communityLink: values.community_link.trim(),
    groupLink: values.group_link.trim(),
  };
}
