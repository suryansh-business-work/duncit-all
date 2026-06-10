export type ExplorePriceFilter = 'ALL' | 'FREE' | 'PAID' | 'PREMIUM';
export type ExploreDateFilter = 'ALL' | 'TODAY' | 'TOMORROW' | 'WEEK' | 'MONTH';
export type ExplorePreset = 'ALL' | 'TRENDING' | 'NEAR' | 'TONIGHT';
export type ExploreSort = 'SOONEST' | 'TRENDING' | 'PRICE_LOW' | 'PRICE_HIGH';

export interface ExploreFilters {
  preset: ExplorePreset;
  categoryId: string;
  price: ExplorePriceFilter;
  date: ExploreDateFilter;
  sort: ExploreSort;
  search: string;
}

interface FilterExplorePodsParams {
  pods: any[];
  clubsById: Map<string, any>;
  categories: any[];
  superCategories: any[];
  superCategorySlug?: string;
  locationId?: string;
  zoneName?: string;
  filters: ExploreFilters;
}

const startOfDay = (date: Date) => {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
};

function dateInRange(value: string | null | undefined, filter: ExploreDateFilter, preset: ExplorePreset) {
  if (!value) return false;
  const date = new Date(value);
  const today = startOfDay(new Date());
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);
  const dayAfter = new Date(today);
  dayAfter.setDate(today.getDate() + 2);
  const weekEnd = new Date(today);
  weekEnd.setDate(today.getDate() + 7);
  const monthEnd = new Date(today);
  monthEnd.setMonth(today.getMonth() + 1);

  if (preset === 'TONIGHT') return date >= today && date < tomorrow;
  if (filter === 'TODAY') return date >= today && date < tomorrow;
  if (filter === 'TOMORROW') return date >= tomorrow && date < dayAfter;
  if (filter === 'WEEK') return date >= today && date < weekEnd;
  if (filter === 'MONTH') return date >= today && date < monthEnd;
  return true;
}

function categoryMatches(club: any, categoryId: string, parentById: Map<string, string | null>) {
  if (!categoryId) return true;
  let current = club?.category_id ?? null;
  let guard = 0;
  while (current && guard++ < 16) {
    if (current === categoryId) return true;
    current = parentById.get(current) ?? null;
  }
  return false;
}

export function filterExplorePods({
  pods,
  clubsById,
  categories,
  superCategories,
  superCategorySlug,
  locationId,
  zoneName,
  filters,
}: FilterExplorePodsParams) {
  const selectedSuperId = superCategorySlug
    ? superCategories.find((category: any) => category.slug === superCategorySlug)?.id
    : null;
  const parentById = new Map(categories.map((category: any) => [category.id, category.parent_id ?? null]));
  const term = filters.search.trim().toLowerCase();

  const filtered = pods.filter((pod) => {
    const club = clubsById.get(pod.club_id);
    if (selectedSuperId && club?.super_category_id !== selectedSuperId) return false;
    if (!categoryMatches(club, filters.categoryId, parentById)) return false;
    if (filters.preset === 'NEAR') {
      if (locationId && pod.location_id !== locationId) return false;
      if (zoneName && pod.zone_name !== zoneName) return false;
    }
    if (filters.price === 'FREE' && !pod.pod_type?.includes('FREE')) return false;
    if (filters.price === 'PAID' && !(pod.pod_type === 'NATIVE_PAID' || pod.pod_type === 'NON_NATIVE_PAID')) return false;
    if (filters.price === 'PREMIUM' && pod.pod_type !== 'NATIVE_PAID_PREMIUM') return false;
    if (!dateInRange(pod.pod_date_time, filters.date, filters.preset)) return false;
    if (term) {
      const haystack = [pod.pod_title, pod.pod_description, pod.place_label, pod.place_detail, pod.zone_name, club?.club_name]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      if (!haystack.includes(term)) return false;
    }
    return true;
  });

  filtered.sort((a, b) => {
    if (filters.preset === 'TRENDING' || filters.sort === 'TRENDING') {
      const scoreA = (a.like_count ?? 0) * 3 + (a.comment_count ?? 0) * 2 + (a.pod_attendees?.length ?? 0);
      const scoreB = (b.like_count ?? 0) * 3 + (b.comment_count ?? 0) * 2 + (b.pod_attendees?.length ?? 0);
      if (scoreB !== scoreA) return scoreB - scoreA;
    }
    if (filters.sort === 'PRICE_LOW') return Number(a.pod_amount ?? 0) - Number(b.pod_amount ?? 0);
    if (filters.sort === 'PRICE_HIGH') return Number(b.pod_amount ?? 0) - Number(a.pod_amount ?? 0);
    return new Date(a.pod_date_time || 0).getTime() - new Date(b.pod_date_time || 0).getTime();
  });

  return filtered;
}

export function activeExploreFilterCount(filters: ExploreFilters) {
  return Number(filters.preset !== 'ALL') + Number(!!filters.categoryId) + Number(filters.price !== 'ALL') + Number(filters.date !== 'ALL') + Number(filters.sort !== 'SOONEST') + Number(!!filters.search.trim());
}