import { usePageMeta } from '@duncit/app-settings';

/**
 * The app name the server put in the document. Reading it back beats querying
 * branding again: it is the exact string `server/render-html.ts` suffixed the
 * title with, so the client cannot drift from the server, and it costs no
 * request. index.html carries the same tag for `vite dev`, where no runner is
 * involved.
 */
export function appNameFromDocument(): string {
  const tag = globalThis.document.querySelector('meta[name="apple-mobile-web-app-title"]');
  return tag?.getAttribute('content') || 'Duncit';
}

/**
 * Name the tab after the entity a detail page is showing, matching what the
 * server rendered for a direct load of the same URL.
 *
 * The title arrives asynchronously, and an empty one is ignored rather than
 * written, so the tab keeps the generic name `RouteMeta` set until the entity
 * resolves instead of blanking mid-request.
 */
export function useEntityPageMeta(title: string | null | undefined): void {
  usePageMeta({ title: title ?? '', appName: appNameFromDocument() });
}
