import { useState } from 'react';
import { useDebouncedValue } from '@duncit/ui';
import { filterTabItems, type FilteredTabs } from './tabSearch';
import type { DuncitTabItem, TabValue } from './types';

/**
 * How long a typed word waits before the strip narrows.
 *
 * Long enough that a reader typing "cancel" redraws the strip once instead of
 * six times — and short enough that the pause is not read as a dead box. The
 * INPUT itself is never debounced; only the filtering is, so the field stays
 * exactly as responsive as any other text field.
 */
export const TAB_SEARCH_DEBOUNCE_MS = 250;

export interface TabSearchState<T extends TabValue> extends FilteredTabs<T> {
  /** What is in the box right now, undebounced. */
  input: string;
  setInput: (next: string) => void;
}

/**
 * The tab strip's own search: what was typed, and which tabs survive it.
 *
 * Client-side by design — the strip already holds every tab it could show, so
 * a round trip could only tell it what it knows. Exported because a page that
 * renders its tabs through something other than `<DuncitTabs>` (a segmented
 * control, a native twin's props) still wants the one filter, not a second one.
 */
export function useTabSearch<T extends TabValue>(
  items: readonly DuncitTabItem<T>[],
  value: T
): TabSearchState<T> {
  const [input, setInput] = useState('');
  const query = useDebouncedValue(input, TAB_SEARCH_DEBOUNCE_MS);
  return { input, setInput, ...filterTabItems(items, query, value) };
}
