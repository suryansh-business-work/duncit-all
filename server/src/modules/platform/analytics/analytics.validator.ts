import { z } from 'zod';
import { filled, maxLen, obj, shape, str, trim } from '@utils/zod-fields';

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
