import { useMemo, useState } from 'react';
import { useCategoryValue, type AdminCategoryValue } from '@duncit/category';

/**
 * The category picker above the pod form. A pod inherits its category from its
 * club, so the picker persists nothing — it narrows which clubs are offered.
 *
 * Until the admin touches it, the picker SHOWS the selected club's category:
 * an existing pod opens on the Edit page with its Super / Category / Sub
 * already filled in, instead of blank over a club that has one. Once the admin
 * picks (or clears) a category, their choice wins.
 */
export function usePodCategoryFilter(clubs: any[], selectedClubId: string) {
  const [picked, setPicked] = useState<AdminCategoryValue | null>(null);
  const selectedClub = clubs.find((club: any) => String(club?.id) === selectedClubId);
  const clubCategory = useCategoryValue(selectedClub?.super_category_id, selectedClub?.category_id);
  const value = picked ?? clubCategory;

  const clubsInCategory = useMemo(() => {
    if (!value.super_id || !value.sub_id) return clubs;
    return clubs.filter(
      (club: any) =>
        // The club already chosen always stays listed: a filter that hides it
        // leaves the Club select rendering blank over a value the form holds.
        String(club?.id) === selectedClubId ||
        (String(club?.super_category_id ?? '') === value.super_id &&
          String(club?.category_id ?? '') === value.sub_id),
    );
  }, [clubs, value.super_id, value.sub_id, selectedClubId]);

  return { value, onChange: setPicked, clubsInCategory };
}
