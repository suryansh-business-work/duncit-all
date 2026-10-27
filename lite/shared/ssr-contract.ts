/**
 * What the Node server and the web app's server entry agree on for a
 * server-rendered page (web/entry-server.tsx ↔ server/html/render.ts).
 * Kept free of React and DOM types so the server build can import it.
 */

/** The cookie that mirrors the web app's session token, so the server can render a signed-in page. */
export const SESSION_COOKIE = 'lite_session';

/** `window[SSR_STATE_GLOBAL]` carries the server's Apollo cache and whether it rendered signed in. */
export const SSR_STATE_GLOBAL = '__LITE_SSR__';

/** Markers inside `<div id="root">` in index.html: the boot loader between them is swapped for the rendered page. */
export const SSR_START = '<!--ssr:start-->';
export const SSR_END = '<!--ssr:end-->';

export interface LiteSsrInput {
  /** Path and query of the page, e.g. `/e/garden-party?ref=x`. */
  url: string;
  /** The session token from the cookie, or null for an anonymous render. */
  token: string | null;
  /** Where the render's own GraphQL calls go (the same process, over loopback). */
  graphqlUrl: string;
  signal?: AbortSignal;
}

export interface LiteSsrState {
  /** Apollo's extracted cache. */
  apollo: unknown;
  /** True when the page was rendered for a signed-in viewer. */
  signedIn: boolean;
}

export interface LiteSsrOutput {
  /** The app's markup, for inside `#root`. */
  html: string;
  /** Tags for `<head>`: the colour-scheme script that must run before first paint. */
  head: string;
  state: LiteSsrState;
  /** 404 when the router landed on the not-found page. */
  status: number;
}

export interface LiteSsrModule {
  render(input: LiteSsrInput): Promise<LiteSsrOutput>;
}

/** JSON for an inline `<script>`: every `<` escaped, so a value carrying `</script>` cannot close the tag. */
export const serializeState = (state: LiteSsrState): string => JSON.stringify(state).replaceAll('<', String.raw`<`);
