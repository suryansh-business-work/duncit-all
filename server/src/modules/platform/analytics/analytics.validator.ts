import { z } from 'zod';
import {
  arr,
  filled,
  finite,
  gte,
  int,
  matches,
  maxItems,
  maxLen,
  minItems,
  num,
  obj,
  shape,
  str,
  trim,
} from '@utils/zod-fields';

const isLinkOrEmpty = (value: string) => {
  if (!value) return true;
  try {
    const parsed = new URL(value);
    return ['http:', 'https:', 'mailto:', 'tel:'].includes(parsed.protocol);
  } catch {
    return false;
  }
};

const optionalUrl = () =>
  str(z.string().check(maxLen(2048)).refine(isLinkOrEmpty, 'Use a valid URL'), { transforms: [trim], default: '' });
const trimmedUpTo = (max: number) => str(z.string().check(maxLen(max)), { transforms: [trim], default: '' });
const nullableText = (max?: number) =>
  str(z.string().check(...(max ? [maxLen(max)] : [])).nullable(), { transforms: [trim], default: null });
const requiredUpTo = (max: number) => str(z.string().check(maxLen(max), filled()), { required: true, transforms: [trim] });

const EVENT_TYPES = ['PAGE_VIEW', 'IMPRESSION', 'CLICK', 'TOUCH'] as const;

export const recordAppEventSchema = obj(
  shape({
    event_type: str(z.enum(EVENT_TYPES), { oneOf: EVENT_TYPES, required: true }),
    client_event_id: trimmedUpTo(120),
    path: str(z.string().check(maxLen(600), filled()), { required: true, transforms: [trim] }),
    route: trimmedUpTo(300),
    title: trimmedUpTo(180),
    target_tag: trimmedUpTo(60),
    target_text: trimmedUpTo(240),
    target_label: trimmedUpTo(180),
    target_role: trimmedUpTo(80),
    target_href: optionalUrl(),
    super_category_slug: nullableText(120),
    pod_id: nullableText(),
    checkout_url: optionalUrl(),
    metadata_json: trimmedUpTo(4000),
    occurred_at: nullableText(),
  })
);

export type RecordAppEventDTO = z.infer<typeof recordAppEventSchema>;

/** One batch is what a device collects in a few seconds; more than this is not an app talking. */
export const MAX_EVENTS_PER_BATCH = 50;

/** snake_case, starting with a letter: `screen_view`, `element_click`, `search_performed`. */
const EVENT_NAME = /^[a-z][a-z0-9_]{1,63}$/;
const PLATFORMS = ['ios', 'android', 'web', 'mweb'] as const;

/** One event of a `recordAppEvents` batch — the taxonomy fields every surface sends. */
const productEventSchema = shape({
  event_name: str(z.string().check(matches(EVENT_NAME, 'Event names are snake_case'), filled()), {
    required: true,
    transforms: [trim],
  }),
  client_event_id: requiredUpTo(120),
  session_id: requiredUpTo(120),
  occurred_at: requiredUpTo(40),
  platform: str(z.enum(PLATFORMS).nullable(), { oneOf: [...PLATFORMS, null], default: null }),
  app_version: trimmedUpTo(40),
  os_version: trimmedUpTo(40),
  device_type: trimmedUpTo(20),
  screen_name: trimmedUpTo(120),
  previous_screen: trimmedUpTo(120),
  path: trimmedUpTo(600),
  title: trimmedUpTo(180),
  element_id: trimmedUpTo(120),
  element_type: trimmedUpTo(40),
  element_name: trimmedUpTo(180),
  element_text: trimmedUpTo(240),
  target_href: optionalUrl(),
  duration_ms: num(finite().check(int(), gte(0)).nullable(), { default: null }),
  super_category_slug: nullableText(120),
  pod_id: nullableText(40),
  properties_json: trimmedUpTo(2000),
});

export const recordAppEventsSchema = arr(
  z.array(productEventSchema).check(minItems(1), maxItems(MAX_EVENTS_PER_BATCH)),
  { required: true }
);

export type ProductEventDTO = z.infer<typeof productEventSchema>;
