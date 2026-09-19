import type { NestedCatalogue } from '../catalogue';

/**
 * @duncit/tabs' own copy — the words the tab strip's search box supplies.
 *
 * A namespace of its own rather than `shell.*` or `mweb.*`, for the usual
 * reason (rule 38/40): the same strip renders in mWeb AND in every portal, so
 * one of those bundles would leave the other printing the raw key.
 */
export const TABS_BUNDLE: NestedCatalogue = {
  tabs: {
    /** The box at the head of every strip, which filters the tabs themselves. */
    search: {
      placeholder: 'Search tabs',
      clear: 'Clear tab search',
      /**
       * Said when a typed word matches no tab. The open tab keeps its place in
       * the strip even then — hiding it would leave the page showing a panel
       * whose tab is gone — so this line is what tells the reader the rest were
       * filtered out rather than lost.
       */
      noMatches: 'No tab matches “{needle}”.',
    },
  },
};
