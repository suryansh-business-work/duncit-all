/**
 * duncit.com/solutions: offerings managed in the Website portal (content type
 * SOLUTIONS), listed by who they are for and filed under a category.
 *
 *   /solutions                                  every audience, every offering
 *   /solutions/<category_slug>/<slug>           one offering
 *
 * The website renders these and the Website portal edits them; both read the
 * rules here so the order and the URLs cannot drift. Framework-free.
 */

/** Who an offering is for, in the order /solutions lists them. Mirrors `SolutionAudience`. */
export const SOLUTION_AUDIENCES = ['VENUE', 'HOST', 'CLUB_ADMIN', 'CREATOR', 'COMMUNITY'] as const;
export type SolutionAudience = (typeof SOLUTION_AUDIENCES)[number];

/** Each audience's copy key segment (`website.main.solutions.audiences.<key>.*`). */
export const SOLUTION_AUDIENCE_KEYS: Readonly<Record<SolutionAudience, string>> = {
  VENUE: 'venue',
  HOST: 'host',
  CLUB_ADMIN: 'clubAdmin',
  CREATOR: 'creator',
  COMMUNITY: 'community',
};

/** The Venue Kit's slug: the one offering with a page of its own instead of the generic one. */
export const VENUE_KIT_SOLUTION_SLUG = 'venue-kit';

/** A SOLUTIONS entry as `publicWebsiteContent(type: SOLUTIONS)` returns it. */
export interface SolutionItem {
  title: string;
  slug: string;
  summary: string;
  body: string;
  category: string;
  category_slug: string;
  image_url: string;
  cta_label: string;
  cta_url: string;
  audience: SolutionAudience | null;
  coming_soon: boolean;
  sort_order: number;
}

/** The category segment the server seeds the Venue Kit under. */
export const VENUE_KIT_CATEGORY_SLUG = 'cafe-restaurant-automation';

/** The Venue Kit's address as seeded — where the old /venue-kit link forwards when nothing else is known. */
export const VENUE_KIT_FALLBACK_PATH = `/solutions/${VENUE_KIT_CATEGORY_SLUG}/${VENUE_KIT_SOLUTION_SLUG}`;

/** The words a fallback entry needs; the caller reads them from its own catalogue (no copy lives here). */
export interface SolutionFallbackCopy {
  title: string;
  summary: string;
  category: string;
  cta_label: string;
}

/**
 * What a static build lists when the API cannot be reached: the Venue Kit, in
 * the shape the server seeds it, worded by the caller's translator. The
 * Website portal's own entries always win when the API answers.
 */
export const venueKitFallbackSolution = (copy: Readonly<SolutionFallbackCopy>): SolutionItem => ({
  ...copy,
  slug: VENUE_KIT_SOLUTION_SLUG,
  body: '',
  category_slug: VENUE_KIT_CATEGORY_SLUG,
  image_url: 'https://images.unsplash.com/photo-1770739539412-d9e1021429cf?w=900&q=80&auto=format&fit=crop',
  cta_url: '',
  audience: 'VENUE',
  coming_soon: true,
  sort_order: 10,
});

/** An offering's own address. */
export const solutionPath = (item: Readonly<Pick<SolutionItem, 'category_slug' | 'slug'>>): string =>
  `/solutions/${item.category_slug}/${item.slug}`;

/** Whether an entry can be listed: it names a known audience and has both URL segments. */
export const isListableSolution = (item: Readonly<SolutionItem>): boolean =>
  item.audience !== null &&
  (SOLUTION_AUDIENCES as readonly string[]).includes(item.audience) &&
  item.slug !== '' &&
  item.category_slug !== '';

export interface SolutionCategoryGroup {
  name: string;
  slug: string;
  items: SolutionItem[];
}

export interface SolutionAudienceGroup {
  audience: SolutionAudience;
  key: string;
  /** Empty for an audience with nothing yet — the page shows it as coming soon. */
  categories: SolutionCategoryGroup[];
}

/**
 * Every audience in display order, each with its offerings grouped by
 * category (first-seen order, which follows the portal's sort order). An
 * audience with no offering is still returned, with no categories.
 */
export function groupSolutions(items: readonly SolutionItem[]): SolutionAudienceGroup[] {
  const listable = items.filter(isListableSolution);
  return SOLUTION_AUDIENCES.map((audience) => {
    const categories: SolutionCategoryGroup[] = [];
    for (const item of listable.filter((entry) => entry.audience === audience)) {
      let group = categories.find((category) => category.slug === item.category_slug);
      if (!group) {
        group = { name: item.category, slug: item.category_slug, items: [] };
        categories.push(group);
      }
      group.items.push(item);
    }
    return { audience, key: SOLUTION_AUDIENCE_KEYS[audience], categories };
  });
}
