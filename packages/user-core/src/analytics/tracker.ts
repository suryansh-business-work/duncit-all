import { makeDeviceId } from '../device';
import { createEventQueue } from './queue';
import { redactText } from './redact';
import { createSessionClock } from './session';
import {
  PRODUCT_EVENTS,
  type ProductEventPayload,
  type ProductPlatform,
  type ProductProperties,
} from './taxonomy';

/**
 * The product-analytics tracker every surface runs: mWeb wires it to the
 * router and the document, the native app to React Navigation and AppState.
 * It owns the parts that must behave the same everywhere — the session, the
 * screen sequence and the foreground time on each screen, batching, redaction
 * and consent — so the numbers on the Analytics console mean the same thing
 * whichever surface they came from.
 */

export interface TrackerOptions {
  platform: ProductPlatform;
  appVersion: string;
  osVersion?: string;
  deviceType?: string;
  /** Sends one batch to the server (`recordAppEvents`). */
  send: (events: ProductEventPayload[]) => Promise<unknown>;
  /** The analytics consent, read at every event: nothing is queued without it. */
  allowed: () => boolean;
  now?: () => number;
  newId?: () => string;
  /** How long an event may wait before its batch leaves. */
  flushAfterMs?: number;
}

/** What an event may say about where it happened, beside its name. */
export interface EventContext {
  path?: string;
  title?: string;
  superCategorySlug?: string | null;
  podId?: string | null;
  properties?: ProductProperties;
}

/** The control a click was on. `id` is its test id; `name` its visible or accessible label. */
export interface ElementRef {
  id?: string;
  name?: string;
  type?: string;
  text?: string;
  href?: string;
}

export interface ProductTracker {
  /** The app launched. */
  open(): void;
  /** A screen opened. Repeating the screen on top does nothing. */
  screen(name: string, context?: EventContext): void;
  click(element: ElementRef, context?: EventContext): void;
  /** Any other taxonomy event (`search_performed`, `element_impression`). */
  track(name: string, context?: EventContext & { element?: ElementRef }): void;
  /** The app went to the background: closes the time on the current screen and sends what is queued. */
  background(): void;
  /** The app came back. */
  foreground(): void;
  flush(): Promise<void>;
  /** Stops the pending timer — for teardown. */
  stop(): void;
}

const DEFAULT_FLUSH_AFTER_MS = 10_000;

function propertiesJson(properties: ProductProperties | undefined): string {
  if (!properties) return '';
  const safe: Record<string, string | number | boolean | null> = {};
  for (const [key, value] of Object.entries(properties)) {
    safe[key] = typeof value === 'string' ? redactText(value, 200) : value;
  }
  return JSON.stringify(safe);
}

export function createProductTracker(options: TrackerOptions): ProductTracker {
  const now = options.now ?? Date.now;
  const newId = options.newId ?? makeDeviceId;
  const flushAfterMs = options.flushAfterMs ?? DEFAULT_FLUSH_AFTER_MS;
  const session = createSessionClock({ newId });
  const queue = createEventQueue<ProductEventPayload>({ send: options.send });
  let timer: ReturnType<typeof setTimeout> | null = null;
  let current = '';
  let shownSince = now();
  let inFront = true;

  const flush = () => {
    if (timer) clearTimeout(timer);
    timer = null;
    return queue.flush();
  };

  const schedule = () => {
    timer ??= setTimeout(() => {
      timer = null;
      flush();
    }, flushAfterMs);
  };

  /** Foreground time on the current screen since it was shown or the app came back. */
  const dwell = (at: number) => (current && inFront ? Math.max(0, at - shownSince) : null);

  const emit = (
    name: string,
    at: number,
    fields: Partial<ProductEventPayload> = {},
    context: EventContext = {}
  ): void => {
    if (!options.allowed()) return;
    queue.push({
      event_name: name,
      client_event_id: newId(),
      session_id: session.touch(at).id,
      occurred_at: new Date(at).toISOString(),
      platform: options.platform,
      app_version: options.appVersion,
      os_version: options.osVersion ?? '',
      device_type: options.deviceType ?? '',
      screen_name: current,
      previous_screen: '',
      path: context.path ?? '',
      title: redactText(context.title, 180),
      element_id: '',
      element_type: '',
      element_name: '',
      element_text: '',
      target_href: '',
      duration_ms: null,
      super_category_slug: context.superCategorySlug ?? null,
      pod_id: context.podId ?? null,
      properties_json: propertiesJson(context.properties),
      ...fields,
    });
    schedule();
  };

  const elementFields = (element: ElementRef): Partial<ProductEventPayload> => ({
    element_id: element.id ?? '',
    element_type: element.type ?? '',
    element_name: redactText(element.name, 180),
    element_text: redactText(element.text, 120),
    target_href: element.href ?? '',
  });

  return {
    open: () => emit(PRODUCT_EVENTS.appOpen, now()),
    screen(name, context) {
      if (!name || name === current) return;
      const at = now();
      const previous = current;
      const spent = dwell(at);
      current = name;
      shownSince = at;
      emit(PRODUCT_EVENTS.screenView, at, { screen_name: name, previous_screen: previous, duration_ms: spent }, context);
    },
    click: (element, context) => emit(PRODUCT_EVENTS.elementClick, now(), elementFields(element), context),
    track(name, context = {}) {
      emit(name, now(), context.element ? elementFields(context.element) : {}, context);
    },
    background() {
      if (!inFront) return;
      const at = now();
      emit(PRODUCT_EVENTS.appBackground, at, { duration_ms: dwell(at) });
      inFront = false;
      flush();
    },
    foreground() {
      if (inFront) return;
      inFront = true;
      shownSince = now();
      emit(PRODUCT_EVENTS.appForeground, shownSince);
    },
    flush,
    stop() {
      if (timer) clearTimeout(timer);
      timer = null;
    },
  };
}
