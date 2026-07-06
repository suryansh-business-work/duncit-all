/** Minimal shape needed to walk the category tree. */
export interface CategoryNode {
  id: string;
  parent_id?: string | null;
}

/** What a club/pod carries to be matched against a selected category chip. */
export interface CategoryTagged {
  category_id?: string | null;
  super_category_id?: string | null;
}

/**
 * Builds a category matcher from the full category tree. A club matches a
 * selected chip when the club's category and the chip lie on the same
 * root-to-leaf path — equal, an ancestor, or a descendant of one another — plus
 * a direct super-category match. This is what makes the "All {category}" chip
 * (a CATEGORY-level id) keep clubs that are tagged at its SUB descendants;
 * flat equality alone would match nothing and the reset looked broken.
 *
 * An empty `selectedId` means "All" and matches everything.
 */
export function makeCategoryMatcher(categories: CategoryNode[]) {
  const parentById = new Map(categories.map((c) => [c.id, c.parent_id ?? null]));
  const isDescendantOf = (
    childId: string | null | undefined,
    ancestorId: string | null | undefined,
  ): boolean => {
    if (!ancestorId) return false;
    let cur: string | null | undefined = childId;
    let guard = 0;
    while (cur && guard++ < 16) {
      if (cur === ancestorId) return true;
      cur = parentById.get(cur) ?? null;
    }
    return false;
  };
  return (club: CategoryTagged | null | undefined, selectedId: string): boolean => {
    if (!selectedId) return true;
    if (!club) return false;
    return (
      club.category_id === selectedId ||
      club.super_category_id === selectedId ||
      isDescendantOf(club.category_id, selectedId) ||
      isDescendantOf(selectedId, club.category_id)
    );
  };
}
