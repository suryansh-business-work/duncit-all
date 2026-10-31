import type { BannerStyle } from '../podPromo.types';

/**
 * Which banner family a pod gets from its category, when nobody chose one.
 *
 * Categories are admin data, so they are matched by the words in their
 * names, not by id: a new "Pickleball" category lands in Sport night without
 * anyone editing this file. The first rule whose word appears in any of the
 * pod club's category names wins; nothing matching falls to Festive bold.
 */
export const CATEGORY_STYLE_RULES: readonly { words: readonly string[]; style: BannerStyle }[] = [
  {
    style: 'SPORT_NIGHT',
    words: ['sport', 'football', 'cricket', 'badminton', 'pickleball', 'tennis', 'run', 'cycling', 'trek', 'hike', 'fitness', 'gym', 'match', 'screening', 'game'],
  },
  {
    style: 'CALM_WELLNESS',
    words: ['wellness', 'yoga', 'meditation', 'mindful', 'breath', 'sound', 'healing', 'pilates', 'retreat', 'spa'],
  },
  {
    style: 'PLAYFUL_PASTEL',
    words: ['art', 'craft', 'paint', 'pottery', 'kid', 'pet', 'dog', 'cat', 'baking', 'diy', 'hobby', 'board'],
  },
  {
    style: 'ELEGANT_SERIF',
    words: ['food', 'dining', 'wine', 'brunch', 'book', 'poetry', 'culture', 'heritage', 'theatre', 'networking', 'business', 'talk'],
  },
  {
    style: 'FESTIVE_BOLD',
    words: ['music', 'party', 'dance', 'festival', 'festive', 'comedy', 'night', 'concert', 'karaoke', 'social'],
  },
];

export const DEFAULT_STYLE: BannerStyle = 'FESTIVE_BOLD';

/** The family for a pod whose club sits in these categories. */
export function styleForCategories(names: readonly string[]): BannerStyle {
  const haystack = names.map((name) => name.toLowerCase());
  const rule = CATEGORY_STYLE_RULES.find((candidate) => candidate.words.some((word) => haystack.some((name) => name.includes(word))));
  return rule?.style ?? DEFAULT_STYLE;
}
