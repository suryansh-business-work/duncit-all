import { useEffect } from 'react';

export interface PageMetaInput {
  /** Bare page title — the ` | appName` suffix is this module's job. */
  title: string;
  description?: string;
  /** Product name the title is suffixed with, e.g. "Duncit" or "Duncit Admin". */
  appName: string;
}

/**
 * The suffix rule is a MIRROR of app/mweb/server/render-html.ts. mWeb renders
 * its `<title>` server-side and then keeps it in sync on the client, so the two
 * must agree character for character — a client navigation that reshaped the
 * title would make the tab flicker into a different format than the document
 * the server just sent.
 */
export function pageTitle(title: string, appName: string): string {
  return title === appName ? title : `${title} | ${appName}`;
}

function setDescription(description: string): void {
  const { document } = globalThis;
  let tag = document.querySelector('meta[name="description"]');
  if (!tag) {
    tag = document.createElement('meta');
    tag.setAttribute('name', 'description');
    document.head.append(tag);
  }
  tag.setAttribute('content', description);
}

/**
 * Write a page's title and description to the document. Kept separate from the
 * hook so it can be exercised without rendering anything.
 */
export function applyPageMeta({ title, description, appName }: PageMetaInput): void {
  globalThis.document.title = pageTitle(title, appName);
  if (description) setDescription(description);
}

/**
 * Keep the document title (and description) matching the page being shown.
 *
 * A single-page app changes route without reloading, so nothing resets the
 * `<title>` the server rendered — every surface that routes on the client needs
 * this, or the tab keeps naming whichever page was loaded first.
 *
 * An empty title is ignored rather than written: pages resolve their name
 * asynchronously (a pod's title, a ticket's subject) and blanking the tab while
 * that request is in flight is worse than briefly showing the previous name.
 */
export function usePageMeta({ title, description, appName }: PageMetaInput): void {
  useEffect(() => {
    if (!title || !appName) return;
    applyPageMeta({ title, description, appName });
  }, [title, description, appName]);
}
