/**
 * The shapes the layout and the package page both need, in one place so the
 * "On this page" rail and the prev/next pager cannot describe the list two
 * different ways.
 */

export interface TocItem {
  /** 2 for a section, 3 for a subsection. Deeper headings are left out of the rail. */
  depth: number;
  slug: string;
  text: string;
}

export interface PackageLink {
  /** Folder under `packages/`, which is also the URL segment. */
  dir: string;
  /** Published name, e.g. `@duncit/regex`. */
  name: string;
}

/**
 * The packages either side of `dir` in the sidebar order.
 *
 * Alphabetical is the only order the sidebar has, so it is the only order the
 * pager can honestly claim to follow — anything else would send a reader
 * "next" to a page that is not next.
 */
export function neighbours(
  sorted: readonly PackageLink[],
  dir: string,
): { prev: PackageLink | null; next: PackageLink | null } {
  const index = sorted.findIndex((item) => item.dir === dir);
  if (index === -1) return { prev: null, next: null };

  return {
    prev: sorted[index - 1] ?? null,
    next: sorted[index + 1] ?? null,
  };
}
