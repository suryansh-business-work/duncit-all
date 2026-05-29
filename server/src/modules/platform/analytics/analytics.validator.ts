import * as yup from 'yup';

const optionalUrl = yup.string().trim().max(2048).test('url', 'Use a valid URL', (value) => {
  if (!value) return true;
  try {
    const parsed = new URL(value);
    return ['http:', 'https:', 'mailto:', 'tel:'].includes(parsed.protocol);
  } catch {
    return false;
  }
});

export const recordAppEventSchema = yup.object({
  event_type: yup.string().oneOf(['PAGE_VIEW', 'IMPRESSION', 'CLICK', 'TOUCH']).required(),
  client_event_id: yup.string().trim().max(120).default(''),
  path: yup.string().trim().max(600).required(),
  route: yup.string().trim().max(300).default(''),
  title: yup.string().trim().max(180).default(''),
  target_tag: yup.string().trim().max(60).default(''),
  target_text: yup.string().trim().max(240).default(''),
  target_label: yup.string().trim().max(180).default(''),
  target_role: yup.string().trim().max(80).default(''),
  target_href: optionalUrl.default(''),
  super_category_slug: yup.string().trim().max(120).nullable().default(null),
  pod_id: yup.string().trim().nullable().default(null),
  checkout_url: optionalUrl.default(''),
  metadata_json: yup.string().trim().max(4000).default(''),
  occurred_at: yup.string().trim().nullable().default(null),
});

export type RecordAppEventDTO = yup.InferType<typeof recordAppEventSchema>;