import { useEffect } from 'react';
import { gql, type TypedDocumentNode } from '@apollo/client';
import { useMutation } from '@apollo/client/react';
import type { MutationRecordAppEventsArgs } from '@duncit/gql-types';
import { screenNameFromPath, type ElementRef } from '@duncit/user-core';
import { connectProductAnalytics, productTracker } from './productAnalytics';

interface Args {
  /** The route with its query string. */
  path: string;
  superCategory: string;
}

const RECORD_APP_EVENTS: TypedDocumentNode<{ recordAppEvents: number }, MutationRecordAppEventsArgs> = gql`
  mutation RecordAppEvents($events: [AppEventInput!]!) {
    recordAppEvents(events: $events)
  }
`;

// What is tracked, and what is not:
//   - app_open once per tab, app_background / app_foreground as the tab hides and shows,
//   - one screen_view per route (ids in the path become `:id`),
//   - an element_click only when a real control was pressed (links, buttons, tabs, menu items),
//   - an element_impression only for elements opted in with [data-track-impression].
// Never raw clicks on non-interactive areas, touches, or a DOM rescan on every mutation.
// Signed out too: a visitor is tracked by the device id, and only with analytics consent.
const clickSelector = 'a, button, [role="button"], [role="tab"], [role="menuitem"], [role="link"]';
const impressionSelector = '[data-track-impression]';

const textFor = (target: Element) => (target.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 240);

/** The control as the Analytics console names it: its test id, its accessible name, its kind. */
export function elementOf(control: Element): ElementRef {
  const text = textFor(control);
  const role = control.getAttribute('role');
  const tag = control.tagName.toLowerCase();
  return {
    id: control.getAttribute('data-testid') || control.getAttribute('data-track-impression') || control.id || undefined,
    name: control.getAttribute('aria-label') || control.getAttribute('title') || text,
    type: role || (tag === 'a' ? 'link' : tag),
    text,
    href: control.closest('a')?.href,
  };
}

export function useClickstreamTracking({ path, superCategory }: Args) {
  const [record] = useMutation(RECORD_APP_EVENTS);

  useEffect(() => {
    connectProductAnalytics((events) => record({ variables: { events } }));
  }, [record]);

  // The tab opened, and every time it hides or shows again.
  useEffect(() => {
    const tracker = productTracker();
    tracker.open();
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') tracker.background();
      else tracker.foreground();
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      tracker.stop();
    };
  }, []);

  // One screen_view per route.
  useEffect(() => {
    const pathname = path.split('?')[0];
    productTracker().screen(screenNameFromPath(pathname), {
      path,
      title: document.title,
      superCategorySlug: superCategory || null,
    });
  }, [path, superCategory]);

  // A click only on a real control.
  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      const control = event.target instanceof Element ? event.target.closest(clickSelector) : null;
      if (control) productTracker().click(elementOf(control));
    };
    document.addEventListener('click', onClick, true);
    return () => document.removeEventListener('click', onClick, true);
  }, []);

  // An impression only for elements opted in, once each, re-scanned per route.
  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined') return undefined;
    const targets = document.querySelectorAll(impressionSelector);
    if (targets.length === 0) return undefined;
    const seen = new WeakSet<Element>();
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting || seen.has(entry.target)) return;
          seen.add(entry.target);
          productTracker().track('element_impression', { element: elementOf(entry.target) });
        });
      },
      { threshold: 0.6 },
    );
    targets.forEach((node) => observer.observe(node));
    return () => observer.disconnect();
  }, [path]);
}
