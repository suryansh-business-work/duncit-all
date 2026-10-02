import type { CreatePodClub, CreatePodHostCategory } from './create-pod.types';

/** Composite key identifying one host category: `${super}|${sub}`. Shared by the
 * step-2 category picker and the club filter so selection and matching align. */
export const hostCategoryKeyOf = (category: {
  super_category_id?: string | null;
  sub_category_id?: string | null;
}) => `${category.super_category_id ?? ''}|${category.sub_category_id ?? ''}`;

interface ClubFilterOptions {
  hostCategories: CreatePodHostCategory[];
  selectedCategoryKey: string;
  locationId: string;
  locality: string;
  podMode: string;
}

/** Clubs the host may attach this pod to: scoped by the SELECTED host category
 * (Super + Sub) — or all of the host's categories when none is picked yet — then,
 * for physical pods, by the chosen city and (optionally) locality. */
export function filterClubs(clubs: CreatePodClub[], opts: ClubFilterOptions): CreatePodClub[] {
  const activeCategories = opts.selectedCategoryKey
    ? opts.hostCategories.filter((category) => hostCategoryKeyOf(category) === opts.selectedCategoryKey)
    : opts.hostCategories;
  const keys = new Set(
    activeCategories.filter((category) => category.super_category_id).map(hostCategoryKeyOf)
  );
  const matchesCategory = (club: CreatePodClub) => {
    if (keys.size === 0) return true;
    if (!club.super_category_id) return false;
    return (
      keys.has(`${club.super_category_id}|${club.category_id ?? ''}`) ||
      keys.has(`${club.super_category_id}|`)
    );
  };
  return clubs.filter((club) => {
    if (!matchesCategory(club)) return false;
    if (opts.podMode === 'VIRTUAL') return true;
    if (opts.locationId && club.location_id !== opts.locationId) return false;
    if (opts.locality && (club.locality ?? '') !== opts.locality) return false;
    return true;
  });
}
