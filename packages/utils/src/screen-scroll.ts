/**
 * Where a screen opens: a NEW page opens at the top. Shared by the member app
 * and the Duncit CRM app (React Navigation), so the rule cannot drift between
 * them; mWeb applies the same rule in its `RouteScroll`.
 *
 * Framework-free on purpose — the scroll views are typed structurally, so no
 * React Native import lands in a package the portals also load.
 */

/** A React Native `ScrollView` (`scrollTo`) or a `FlatList` / `SectionList` (`scrollToOffset`). */
export interface ScrollableToTop {
  scrollTo?: (options: { x?: number; y?: number; animated?: boolean }) => void;
  scrollToOffset?: (options: { offset: number; animated?: boolean }) => void;
}

/**
 * Puts a scroll view back at its top. A page the user is entering jumps there
 * at once (`animated` false) so it never shows the old offset for a frame.
 * Returns whether anything was scrolled — false for a missing view.
 */
export function scrollToTop(target: ScrollableToTop | null | undefined, animated = false): boolean {
  if (target?.scrollToOffset) {
    target.scrollToOffset({ offset: 0, animated });
    return true;
  }
  if (target?.scrollTo) {
    target.scrollTo({ x: 0, y: 0, animated });
    return true;
  }
  return false;
}

/** The part of a tab navigator's state the rule reads. */
export interface TabStateLike {
  index: number;
  routes: ReadonlyArray<{ key: string }>;
}

/**
 * Whether a tab navigator's new state means the user just ENTERED the tab
 * `routeKey` — the active tab changed and it is now this one. A re-render
 * that keeps the same tab, or coming Back to a tab from a pushed screen (the
 * tab navigator's state does not move), is not an entry, so that tab keeps
 * the place the user left it, as Back does on mWeb.
 */
export function isTabEntry(
  previousIndex: number | undefined,
  state: TabStateLike,
  routeKey: string,
): boolean {
  if (previousIndex === undefined || previousIndex === state.index) return false;
  return state.routes[state.index]?.key === routeKey;
}
