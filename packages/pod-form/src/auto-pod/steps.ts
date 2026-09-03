import type { PodFormValues } from '../types';

/**
 * The fields step 2 validates before the review opens. Everything the schema
 * can fault in Auto Pod mode except the category, which step 1 already owns.
 * `pod_id`, the club, venue, host, payment and meeting fields never render
 * here — the partners who enrol bring them — so a message on them could not
 * be seen.
 */
export const AUTO_POD_DETAIL_FIELDS: (keyof PodFormValues)[] = [
  'pod_title',
  'pod_description',
  'pod_info',
  'pod_hashtag_text',
  'media_text',
  'reel_url',
  'what_this_pod_offers',
  'available_perks',
  'product_requests',
];
