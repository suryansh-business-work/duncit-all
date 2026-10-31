/**
 * What the store's HTML server (server/main.ts) and its React server entry
 * (src/entry-server.tsx) agree on, and what the browser reads back in
 * main.tsx. Free of React and DOM types so the server bundle can import it.
 */

/** `window[SSR_STATE_GLOBAL]` carries the server's Apollo cache to the browser. */
export const SSR_STATE_GLOBAL = '__ECOMM_SSR__';

/** Markers inside `<div id="root">` in index.html: the boot loader between them is swapped for the rendered page. */
export const SSR_START = '<!--ssr:start-->';
export const SSR_END = '<!--ssr:end-->';

export interface StoreSsrInput {
  /** Path and query of the page, e.g. `/p/dog-food?ref=x`. */
  url: string;
  /** Where the render's GraphQL calls go. */
  graphqlUrl: string;
  signal?: AbortSignal;
}

export interface StoreSsrState {
  /** Apollo's extracted cache. */
  apollo: Record<string, unknown>;
}

export interface StoreSsrOutput {
  /** The app's markup, for inside `#root`. */
  html: string;
  state: StoreSsrState;
  /** 404 when the router landed on the not-found page. */
  status: number;
}

export interface StoreSsrModule {
  render(input: StoreSsrInput): Promise<StoreSsrOutput>;
}

/** JSON for an inline `<script>`: every `<` escaped, so a value carrying `</script>` cannot close the tag. */
export const serializeState = (state: StoreSsrState): string => JSON.stringify(state).replaceAll('<', String.raw`<`);
