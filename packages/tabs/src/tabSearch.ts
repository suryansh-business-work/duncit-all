import type { DuncitTabItem, TabValue } from './types';

/**
 * The text one tab is matched on.
 *
 * A label is a `ReactNode` — a count badge, an icon and a word, a whole
 * `<Stack>` — and interpolating one of those into a string yields
 * `[object Object]` (Sonar S6551), so only a string label is read directly.
 * Anything richer falls back to the tab's own `value`, which is a slug and
 * therefore still a fair thing to type; a tab whose label a reader would search
 * by and whose value does not carry it passes `searchText`.
 */
export function tabSearchText<T extends TabValue>(item: Readonly<DuncitTabItem<T>>): string {
  if (item.searchText !== undefined) return item.searchText;
  if (typeof item.label === 'string') return item.label;
  return String(item.value);
}

export interface FilteredTabs<T extends TabValue> {
  /** The tabs to draw, in their original order. */
  visible: readonly DuncitTabItem<T>[];
  /** How many tabs the word actually matched — the open tab aside. */
  matches: number;
  /** The typed word, trimmed, as the reader typed it. */
  needle: string;
}

/**
 * The tabs a typed word leaves standing, with the OPEN tab always among them.
 *
 * Keeping the open tab is not a courtesy: MUI's `<Tabs>` is given a `value`,
 * and a value no child carries drops the indicator and logs an error, while the
 * page below would go on showing a panel whose tab had vanished. So the strip
 * narrows to the matches PLUS the tab already in the URL, and `matches` is what
 * tells the caller the word found nothing.
 *
 * Order is the items' own — a filter never reshuffles a strip a reader has
 * learned the shape of.
 */
export function filterTabItems<T extends TabValue>(
  items: readonly DuncitTabItem<T>[],
  query: string,
  value: T
): FilteredTabs<T> {
  const needle = query.trim();
  if (needle === '') return { visible: items, matches: items.length, needle };
  const lower = needle.toLowerCase();
  const hits = new Set(
    items
      .filter((item) => tabSearchText(item).toLowerCase().includes(lower))
      .map((item) => item.value)
  );
  const visible = items.filter((item) => hits.has(item.value) || item.value === value);
  return { visible, matches: hits.size, needle };
}
