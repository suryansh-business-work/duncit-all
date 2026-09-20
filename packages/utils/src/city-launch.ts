/**
 * A city an admin has added but not yet launched still shows in both apps'
 * location pickers. Its tile counts the people waiting for it instead of its
 * clubs, and choosing it opens the launch waitlist instead of the feed. These
 * are the rules both apps ask — mWeb and native render their own views
 * (rule 40: share the logic, never the UI).
 */

/** The launch goal a city gets when an admin sets none. */
export const DEFAULT_LAUNCH_TARGET = 2000;

/** Whole percent (0–100) of the way to the launch target; 100 once reached, 0 for a non-positive target. */
export function launchProgress(count: number, target: number): number {
  if (target <= 0) return 0;
  return Math.min(100, Math.max(0, Math.round((count / target) * 100)));
}

/** Whether a location-picker tile shows the city's waitlist ("N people are in") rather than its clubs. */
export function showsWaitlist(city: Readonly<{ is_launched?: boolean | null }>): boolean {
  return city.is_launched === false;
}

/** A city as the location picker orders it. */
type PickerCity = Readonly<{ location_name: string; is_launched?: boolean | null }>;

/** Orders a state's cities in the location picker: launched cities first, then the ones still
 * waiting on launch, alphabetical within each group. Pass it straight to `sort`. */
export function compareCitiesLaunchedFirst(a: PickerCity, b: PickerCity): number {
  const waitlistOrder = Number(showsWaitlist(a)) - Number(showsWaitlist(b));
  return waitlistOrder || a.location_name.localeCompare(b.location_name);
}

/**
 * The waitlist page is four full-height sections, top to bottom: the live
 * count, then one each for the three ways to help the city launch. Each plays
 * an admin-set video behind its copy, with an image drawn when the video
 * cannot play or none is set.
 */
export const LAUNCH_SECTIONS = ['hero', 'host', 'venue', 'club_admin'] as const;
export type LaunchSection = (typeof LAUNCH_SECTIONS)[number];

/** The backdrops as `locationLaunchStatus` answers them — the city's own file where it set one, else the global one. */
export type LaunchPageMedia = Record<`${LaunchSection}_video_url` | `${LaunchSection}_image_url`, string>;

/** No backdrop anywhere: every section draws its dark ground alone. */
export const EMPTY_LAUNCH_MEDIA: LaunchPageMedia = {
  hero_video_url: '',
  hero_image_url: '',
  host_video_url: '',
  host_image_url: '',
  venue_video_url: '',
  venue_image_url: '',
  club_admin_video_url: '',
  club_admin_image_url: '',
};

/** One section's backdrop: its video, and the image drawn when the video cannot play or none is set. */
export function launchSectionMedia(
  media: Readonly<LaunchPageMedia>,
  section: LaunchSection,
): { videoUrl: string; imageUrl: string } {
  return { videoUrl: media[`${section}_video_url`], imageUrl: media[`${section}_image_url`] };
}

/** The pictograms the page draws; each app maps them to its own icon set. */
export type LaunchIconKey =
  | 'coffee'
  | 'people'
  | 'event'
  | 'cheers'
  | 'groups'
  | 'shield'
  | 'place'
  | 'calendar'
  | 'sparkle'
  | 'heart'
  | 'chart'
  | 'leaf';

/** A pictogram with its caption — a feature chip, a trust line or a stat disc. */
export interface LaunchItem {
  iconKey: LaunchIconKey;
  /** Written out in full: the translation gate only sees literal keys. */
  labelKey: string;
}

/** The four promises across the top of the live-count section. */
export const LAUNCH_HERO_FEATURES: readonly LaunchItem[] = [
  { iconKey: 'coffee', labelKey: 'mweb.cityLaunch.features.conversations' },
  { iconKey: 'people', labelKey: 'mweb.cityLaunch.features.friends' },
  { iconKey: 'event', labelKey: 'mweb.cityLaunch.features.plans' },
  { iconKey: 'cheers', labelKey: 'mweb.cityLaunch.features.weekends' },
];

/** The three reassurances under the live-count section's button. */
export const LAUNCH_HERO_TRUST: readonly LaunchItem[] = [
  { iconKey: 'groups', labelKey: 'mweb.cityLaunch.trust.circle' },
  { iconKey: 'shield', labelKey: 'mweb.cityLaunch.trust.verified' },
  { iconKey: 'place', labelKey: 'mweb.cityLaunch.trust.events' },
];

/** The Earn journey a role section's button opens — its routes come from @duncit/onboarding. */
export type LaunchRoleKind = 'HOST' | 'VENUE' | 'CLUB_ADMIN';

/**
 * One of the three role sections, as both apps draw it: a small tagline, the
 * headline with its red stroke, optional chips under it, then a glass card
 * with the role's badge, an optional title and body, its stat discs and the
 * "Tell me more" button, and an optional closing line.
 */
export interface LaunchRoleDefinition {
  section: Exclude<LaunchSection, 'hero'>;
  kind: LaunchRoleKind;
  testId: string;
  taglineKey: string;
  eyebrowKey: string;
  titleKey: string;
  subtitleKey?: string;
  chips: readonly LaunchItem[];
  cardTitleKey?: string;
  cardBodyKey?: string;
  stats: readonly LaunchItem[];
  /** How the stats draw: a divided strip of icon + caption, or round discs with the caption under each. */
  statsLayout: 'strip' | 'discs';
  footerKey?: string;
}

/** The three ways to help a city launch, in page order: hosting, a venue, running a club. */
export const LAUNCH_ROLE_SECTIONS: readonly LaunchRoleDefinition[] = [
  {
    section: 'host',
    kind: 'HOST',
    testId: 'city-launch-card-host',
    taglineKey: 'mweb.cityLaunch.hostTagline',
    eyebrowKey: 'mweb.cityLaunch.hostEyebrow',
    titleKey: 'mweb.cityLaunch.hostTitle',
    chips: [
      { iconKey: 'people', labelKey: 'mweb.cityLaunch.hostPoints.people' },
      { iconKey: 'calendar', labelKey: 'mweb.cityLaunch.hostPoints.plans' },
      { iconKey: 'sparkle', labelKey: 'mweb.cityLaunch.hostPoints.hobbies' },
    ],
    cardTitleKey: 'mweb.cityLaunch.hostCardTitle',
    cardBodyKey: 'mweb.cityLaunch.hostBody',
    stats: [
      { iconKey: 'shield', labelKey: 'mweb.cityLaunch.hostTrust.verified' },
      { iconKey: 'groups', labelKey: 'mweb.cityLaunch.hostTrust.safePods' },
      { iconKey: 'heart', labelKey: 'mweb.cityLaunch.hostTrust.friendships' },
    ],
    statsLayout: 'strip',
  },
  {
    section: 'venue',
    kind: 'VENUE',
    testId: 'city-launch-card-venue',
    taglineKey: 'mweb.cityLaunch.venueTagline',
    eyebrowKey: 'mweb.cityLaunch.venueEyebrow',
    titleKey: 'mweb.cityLaunch.venueTitle',
    chips: [],
    cardBodyKey: 'mweb.cityLaunch.venueBody',
    stats: [
      { iconKey: 'groups', labelKey: 'mweb.cityLaunch.venueStats.footfalls' },
      { iconKey: 'calendar', labelKey: 'mweb.cityLaunch.venueStats.communities' },
      { iconKey: 'heart', labelKey: 'mweb.cityLaunch.venueStats.experiences' },
      { iconKey: 'chart', labelKey: 'mweb.cityLaunch.venueStats.growth' },
    ],
    statsLayout: 'discs',
    footerKey: 'mweb.cityLaunch.venueFooter',
  },
  {
    // The keys kept their first-version `volunteer` name (rule 44: a reworded
    // key keeps its key); the copy is Club Admin's.
    section: 'club_admin',
    kind: 'CLUB_ADMIN',
    testId: 'city-launch-card-club-admin',
    taglineKey: 'mweb.cityLaunch.volunteerTagline',
    eyebrowKey: 'mweb.cityLaunch.volunteerEyebrow',
    titleKey: 'mweb.cityLaunch.volunteerTitle',
    subtitleKey: 'mweb.cityLaunch.volunteerBody',
    chips: [
      { iconKey: 'groups', labelKey: 'mweb.cityLaunch.volunteerChips.pods' },
      { iconKey: 'leaf', labelKey: 'mweb.cityLaunch.volunteerChips.interests' },
      { iconKey: 'people', labelKey: 'mweb.cityLaunch.volunteerChips.people' },
    ],
    stats: [
      { iconKey: 'calendar', labelKey: 'mweb.cityLaunch.volunteerStats.pods' },
      { iconKey: 'groups', labelKey: 'mweb.cityLaunch.volunteerStats.members' },
      { iconKey: 'chart', labelKey: 'mweb.cityLaunch.volunteerStats.engagement' },
    ],
    statsLayout: 'discs',
    footerKey: 'mweb.cityLaunch.volunteerFooter',
  },
];
