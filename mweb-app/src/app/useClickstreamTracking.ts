import { useEffect } from 'react';
import { gql, useMutation } from '@apollo/client';

type EventType = 'PAGE_VIEW' | 'IMPRESSION' | 'CLICK' | 'TOUCH';

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

const trackableSelector = 'a,button,[role="button"],[data-track-impression]';

function textFor(target: Element) {
  return (target.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 240);
}

function closestTrackable(target: EventTarget | null) {
  if (!(target instanceof Element)) return null;
  return target.closest(trackableSelector) || target;
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
    viewport: `${window.innerWidth}x${window.innerHeight}`,
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
          route: window.location.pathname,
          title: document.title,
          super_category_slug: superCategory || null,
          metadata_json: metadataJson(extra),
          occurred_at: new Date().toISOString(),
          ...describeTarget(target),
        },
      },
    }).catch(() => {});
  };

  useEffect(() => {
    if (!enabled) return;
    send('PAGE_VIEW', document.body, { source: 'route_change' });
    send('IMPRESSION', document.body, { source: 'screen' });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, path, superCategory]);

  useEffect(() => {
    if (!enabled) return;
    const onClick = (event: MouseEvent) => {
      send('CLICK', closestTrackable(event.target), {
        pointer: 'mouse',
        x: event.clientX,
        y: event.clientY,
      });
    };
    const onTouch = (event: TouchEvent) => {
      const touch = event.touches[0];
      send('TOUCH', closestTrackable(event.target), {
        pointer: 'touch',
        x: touch?.clientX ?? 0,
        y: touch?.clientY ?? 0,
      });
    };
    document.addEventListener('click', onClick, true);
    document.addEventListener('touchstart', onTouch, { capture: true, passive: true });
    return () => {
      document.removeEventListener('click', onClick, true);
      document.removeEventListener('touchstart', onTouch, true);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, path, superCategory]);

  useEffect(() => {
    if (!enabled || typeof IntersectionObserver === 'undefined') return;
    const seen = new WeakSet<Element>();
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting || seen.has(entry.target)) return;
        seen.add(entry.target);
        send('IMPRESSION', entry.target, { source: 'element_visible' });
      });
    }, { threshold: 0.6 });
    const scan = () => document.querySelectorAll(trackableSelector).forEach((node) => observer.observe(node));
    const mutations = new MutationObserver(scan);
    scan();
    mutations.observe(document.body, { childList: true, subtree: true });
    return () => {
      mutations.disconnect();
      observer.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, path, superCategory]);
}