import type { useTranslation } from '@duncit/app-settings';

type Translate = ReturnType<typeof useTranslation>['t'];

export interface SidebarItem {
  /** Stable id — the value handed back to `onSelect`. */
  key: string;
  primary: string;
  /** Shown under the title in monospace: a slug, a category. */
  secondary?: string;
  /** Renders an "off" chip, and is what the status filter reads. */
  off?: boolean;
  /**
   * A number the row carries — the Templates list puts its send count here,
   * the Fragments list the number of templates wrapped in it.
   *
   * Not a link, deliberately: the row is already a button, and an anchor
   * inside one is neither valid nor reachable by keyboard. The clickable
   * version of the same number lives in the editor beside it.
   */
  badge?: { label: string; title: string; muted?: boolean };
  /** The badge's number, as a number — what "Most used" sorts on. */
  count?: number;
  /** ISO timestamp — what "Recently updated" sorts on. */
  updatedAt?: string | null;
  /** Which bucket the optional extra filter narrows to (a fragment key). */
  group?: string | null;
}

/** `list` keeps the order the server answered in, which is the default. */
export type SidebarSort = 'list' | 'name-asc' | 'name-desc' | 'used' | 'recent';
export type SidebarStatus = 'all' | 'active' | 'off';

export interface SidebarOption<T extends string> {
  value: T;
  label: string;
}

/**
 * The sorts this particular list can offer.
 *
 * Derived from the rows rather than passed in: a sort by a number no row
 * carries would sit in the menu doing nothing, and each page would have to
 * remember to configure the same three defaults.
 */
export function sortOptionsFor(t: Translate, items: SidebarItem[]): SidebarOption<SidebarSort>[] {
  const options: SidebarOption<SidebarSort>[] = [
    { value: 'list', label: t('tech.emailSidebar.listOrder') },
    { value: 'name-asc', label: t('tech.emailSidebar.nameAZ') },
    { value: 'name-desc', label: t('tech.emailSidebar.nameZA') },
  ];
  if (items.some((item) => item.count !== undefined)) {
    options.push({ value: 'used', label: t('tech.emailSidebar.mostUsed') });
  }
  if (items.some((item) => item.updatedAt)) {
    options.push({ value: 'recent', label: t('tech.emailSidebar.recentlyUpdated') });
  }
  return options;
}

/**
 * The number a row carries, muted when it is a zero.
 *
 * Both email lists count something — sends for a template, templates for a
 * fragment — and both must show the zeroes: a row nothing has ever used is
 * exactly the row worth finding.
 */
export function countBadge(count: number, title: string): SidebarItem['badge'] {
  return { label: String(count), title, muted: count === 0 };
}

export function statusOptionsFor(t: Translate): SidebarOption<SidebarStatus>[] {
  return [
    { value: 'all', label: t('tech.emailSidebar.anyStatus') },
    { value: 'active', label: t('tech.emailSidebar.activeOnly') },
    { value: 'off', label: t('tech.emailSidebar.switchedOffOnly') },
  ];
}

function matchesSearch(item: SidebarItem, needle: string): boolean {
  if (!needle) return true;
  return (
    item.primary.toLowerCase().includes(needle) ||
    (item.secondary ?? '').toLowerCase().includes(needle)
  );
}

function matchesStatus(item: SidebarItem, status: SidebarStatus): boolean {
  if (status === 'active') return !item.off;
  if (status === 'off') return !!item.off;
  return true;
}

function matchesGroup(item: SidebarItem, group: string): boolean {
  if (!group) return true;
  return (item.group ?? '') === group;
}

/** Null for `list`, which is the absence of a sort rather than a sort. */
function comparatorFor(sort: SidebarSort): ((a: SidebarItem, b: SidebarItem) => number) | null {
  if (sort === 'name-asc') return (a, b) => a.primary.localeCompare(b.primary);
  if (sort === 'name-desc') return (a, b) => b.primary.localeCompare(a.primary);
  if (sort === 'used') return (a, b) => (b.count ?? 0) - (a.count ?? 0);
  if (sort === 'recent') return (a, b) => (b.updatedAt ?? '').localeCompare(a.updatedAt ?? '');
  return null;
}

export interface SidebarView {
  items: SidebarItem[];
  search: string;
  sort: SidebarSort;
  status: SidebarStatus;
  /** '' means every group — the extra filter is off. */
  group: string;
}

/**
 * Search, filters and sort in one pass, as data.
 *
 * A pure function rather than three hooks: what the list shows is exactly this
 * expression, so a test can prove the combination without mounting anything.
 */
export function applySidebarView(view: SidebarView): SidebarItem[] {
  const needle = view.search.trim().toLowerCase();
  const kept = view.items.filter(
    (item) =>
      matchesSearch(item, needle) &&
      matchesStatus(item, view.status) &&
      matchesGroup(item, view.group)
  );
  const comparator = comparatorFor(view.sort);
  return comparator ? [...kept].sort(comparator) : kept;
}

/**
 * Why the list is empty, which is three different situations.
 *
 * "No templates yet" under an active filter reads as a broken page; naming the
 * search term or the filters says the rows are there and something is hiding
 * them.
 */
export function emptyMessage(
  t: Translate,
  input: Readonly<{ search: string; filtered: boolean; emptyText: string }>
): string {
  const needle = input.search.trim();
  if (needle) return t('tech.emailSidebar.nothingMatchesSearch', { vars: { needle } });
  if (input.filtered) return t('tech.emailSidebar.nothingMatchesTheFilters');
  return input.emptyText;
}

/** "12 total", or "3 of 12" once anything is hiding rows. */
export function countLabel(t: Translate, shown: number, total: number): string {
  if (shown === total) return t('tech.emailSidebar.totalCount', { vars: { count: total } });
  return t('tech.emailSidebar.showingOfTotal', { vars: { shown, total } });
}
