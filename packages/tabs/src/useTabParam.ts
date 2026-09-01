import { useCallback, useRef } from 'react';
import { useSearchParams } from 'react-router';
import type { DuncitTabItem, DuncitTabsState, TabValue } from './types';

/**
 * The query key a tab strip writes its selection to.
 *
 * A route that renders a SECOND, independent strip passes its own key
 * (`selectedtab_<scope>`) — one param cannot carry two selections, and the
 * loser would silently snap back to its fallback on every switch.
 */
export const TAB_PARAM = 'selectedtab';

export interface UseTabParamOptions<T extends TabValue> {
  /** The tabs to draw. A URL naming anything else resolves to `fallback`. */
  items: readonly DuncitTabItem<T>[];
  /**
   * The selection when the URL carries nothing usable — normally the first
   * tab. Required rather than defaulted, because `items` may still be empty on
   * the first paint when the tabs come from the server.
   */
  fallback: T;
  /** Key override for a second strip on the same route. */
  param?: string;
}

/**
 * Tab selection held in the URL instead of component state, so a reload, a
 * pasted link and a browser Back all land on the tab that was open.
 *
 * The selection is DERIVED from the query string rather than mirrored into
 * state: a value the strip no longer offers — a server-driven category that
 * disappeared, a hand-typed link, a variant that was deleted — resolves to
 * `fallback` on its own, with no effect to keep the two copies in step.
 *
 * Writes REPLACE the history entry. A tab is a view of the page, not a
 * destination; pushing one entry per switch means Back walks through five tabs
 * before it leaves the page, which is worse than no tab history at all.
 *
 * Returns the controlled contract of `<DuncitTabs>`, so the strip is
 * `<DuncitTabs {...tabs} />` and the page reads `tabs.value`.
 */
export function useTabParam<T extends TabValue>({
  items,
  fallback,
  param = TAB_PARAM,
}: Readonly<UseTabParamOptions<T>>): DuncitTabsState<T> {
  const [searchParams, setSearchParams] = useSearchParams();
  const raw = searchParams.get(param);
  const value = items.find((item) => String(item.value) === raw)?.value ?? fallback;

  // Both of react-router's returns change identity on every navigation, so a
  // setter closing over them would too — and an effect that legitimately lists
  // the setter in its deps would then re-fire on its own write, forever. The
  // refs keep the setter stable while it still reads the CURRENT query string.
  const paramsRef = useRef(searchParams);
  paramsRef.current = searchParams;
  const applyRef = useRef(setSearchParams);
  applyRef.current = setSearchParams;

  const onChange = useCallback((next: T) => {
    const params = new URLSearchParams(paramsRef.current);
    params.set(param, String(next));
    applyRef.current(params, { replace: true });
  }, [param]);

  return { items, value, onChange };
}
