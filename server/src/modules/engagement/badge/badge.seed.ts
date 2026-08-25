import type { BadgeConditionType } from './badge.model';

export interface BadgeSeed {
  badge_id: string;
  title: string;
  description: string;
  condition_type: BadgeConditionType;
  threshold: number;
  role_key: string;
  sort_order: number;
}

/**
 * The slug of the category Pack Champion is scoped to. Categories are managed
 * entirely by admins, so the seed LINKS the badge to this one if it exists and
 * leaves it unlinked otherwise — an unlinked category badge simply has nobody
 * qualifying, and an admin can point it anywhere from Admin > Badges.
 */
/** The badge the pet-category link below belongs to. */
export const PACK_CHAMPION_BADGE_ID = 'pack-champion';

export const PACK_CHAMPION_CATEGORY_SLUG = 'pet';

/**
 * The badges the platform ships with. Seeded with `$setOnInsert`, so a title,
 * threshold or artwork an admin has edited survives every redeploy — this list
 * is the starting catalogue, not a definition of it.
 *
 * Wording is deliberately the same sentence the member reads on their Badges
 * page: the description IS the badge's promise, and it lives in the database so
 * an admin can reword it without a release.
 */
export const DEFAULT_BADGES: readonly BadgeSeed[] = [
  {
    badge_id: 'legend',
    title: 'Legend',
    description: 'Attend 10 or more pods.',
    condition_type: 'POD_ATTEND_COUNT',
    threshold: 10,
    role_key: '',
    sort_order: 10,
  },
  {
    badge_id: 'pack-champion',
    title: 'Pack Champion',
    description: 'Attend 10 or more pet pods.',
    condition_type: 'CATEGORY_POD_ATTEND_COUNT',
    threshold: 10,
    role_key: '',
    sort_order: 20,
  },
  {
    badge_id: 'social-spark',
    title: 'Social Spark',
    description: 'Bring a +1 along to 10 pods.',
    condition_type: 'PLUS_ONE_POD_COUNT',
    threshold: 10,
    role_key: '',
    sort_order: 30,
  },
  {
    badge_id: 'multi-explorer',
    title: 'Multi Explorer',
    description: 'Attend pods across 3 or more different categories.',
    condition_type: 'DISTINCT_CATEGORY_COUNT',
    threshold: 3,
    role_key: '',
    sort_order: 40,
  },
  {
    // "More than 5" is 6 — the threshold is what the member has to reach, so
    // the number here and the number on their progress bar are the same one.
    badge_id: 'monthly-maverick',
    title: 'Monthly Maverick',
    description: 'Attend more than 5 pods within a single calendar month.',
    condition_type: 'MONTHLY_POD_ATTEND_COUNT',
    threshold: 6,
    role_key: '',
    sort_order: 50,
  },
  {
    badge_id: 'duncit-host-partner',
    title: 'Duncit Host Partner',
    description: 'Become a Duncit Host.',
    condition_type: 'ROLE_GRANTED',
    threshold: 1,
    role_key: 'HOST',
    sort_order: 60,
  },
  {
    badge_id: 'duncit-venue-partner',
    title: 'Duncit Venue Partner',
    description: 'Become a Duncit Venue Partner.',
    condition_type: 'ROLE_GRANTED',
    threshold: 1,
    role_key: 'VENUE_OWNER',
    sort_order: 70,
  },
  {
    badge_id: 'duncit-ecommerce-brand-partner',
    title: 'Duncit E-Commerce Brand Partner',
    description: 'Become a Duncit E-Commerce Brand Partner.',
    condition_type: 'ROLE_GRANTED',
    threshold: 1,
    role_key: 'ECOMM_MANAGER',
    sort_order: 80,
  },
  {
    badge_id: 'duncit-club-admin-partner',
    title: 'Duncit Club Admin Partner',
    description: 'Become a Duncit Club Admin.',
    condition_type: 'ROLE_GRANTED',
    threshold: 1,
    role_key: 'CLUB_ADMIN',
    sort_order: 90,
  },
];
