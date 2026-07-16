import { useEffect } from 'react';
import { gql, useMutation } from '@apollo/client';

type EventType = 'PAGE_VIEW' | 'IMPRESSION' | 'CLICK';

interface Args {
  enabled: boolean;
  path: string;
  superCategory: string;
}

const RECORD_APP_EVENT = gql`
  mutation RecordAppEvent($input: RecordAppEventInput!) {
    recordAppEvent(input: $input)
  }
`;

// Core-only tracking. To keep request volume low we send:
//   - one PAGE_VIEW per route change,
//   - a CLICK only when a real interactive control was clicked,
//   - an IMPRESSION only for elements explicitly opted in via
//     [data-track-impression].
// We deliberately do NOT track raw clicks on non-interactive areas, touch
// events, auto-impressions on every link/button, or rescan the DOM on every
// mutation — that was firing dozens of RecordAppEvent calls per interaction.
const clickSelector = 'a, button, [role="button"]';
const impressionSelector = '[data-track-impression]';

function textFor(target: Element) {
  return (target.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 240);
}

function describeTarget(target: Element | null) {
  if (!target) return {};
  const anchor = target.closest('a') as HTMLAnchorElement | null;
  return {
    target_tag: target.tagName.toLowerCase(),
    target_text: textFor(target),
    target_label:
      target.getAttribute('aria-label') ||
      target.getAttribute('title') ||
      target.getAttribute('placeholder') ||
      '',
    target_role: target.getAttribute('role') || '',
    target_href: anchor?.href || '',
  };
}

function metadataJson(extra: Record<string, unknown>) {
  return JSON.stringify({
    viewport: `${globalThis.window.innerWidth}x${globalThis.window.innerHeight}`,
    referrer: document.referrer || '',
    ...extra,
  });
}

export function useClickstreamTracking({ enabled, path, superCategory }: Args) {
  const [recordEvent] = useMutation(RECORD_APP_EVENT);

  const send = (eventType: EventType, target: Element | null, extra: Record<string, unknown> = {}) => {
    if (!enabled || !localStorage.getItem('token')) return;
    recordEvent({
      variables: {
        input: {
          event_type: eventType,
          client_event_id: `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
          path,
          route: globalThis.window.location.pathname,
          title: document.title,
          super_category_slug: superCategory || null,
          metadata_json: metadataJson(extra),
          occurred_at: new Date().toISOString(),
          ...describeTarget(target),
        },
      },
    }).catch(() => {});
  };

  // Core: one PAGE_VIEW per route.
  useEffect(() => {
    if (!enabled) return;
    send('PAGE_VIEW', document.body, { source: 'route_change' });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, path, superCategory]);

  // CLICK only for real interactive controls (buttons / links / role=button).
  useEffect(() => {
    if (!enabled) return;
    const onClick = (event: MouseEvent) => {
      const control = event.target instanceof Element ? event.target.closest(clickSelector) : null;
      if (!control) return; // ignore non-interactive clicks
      send('CLICK', control, { pointer: 'mouse' });
    };
    document.addEventListener('click', onClick, true);
    return () => document.removeEventListener('click', onClick, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, path, superCategory]);

  // IMPRESSION only for elements explicitly opted in with [data-track-impression].
  useEffect(() => {
    if (!enabled || typeof IntersectionObserver === 'undefined') return;
    const targets = document.querySelectorAll(impressionSelector);
    if (targets.length === 0) return;
    const seen = new WeakSet<Element>();
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting || seen.has(entry.target)) return;
          seen.add(entry.target);
          send('IMPRESSION', entry.target, { source: 'element_visible' });
        });
      },
      { threshold: 0.6 },
    );
    targets.forEach((node) => observer.observe(node));
    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, path, superCategory]);
}
