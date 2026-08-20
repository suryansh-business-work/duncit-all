import { EMPTY_CATEGORY, type AdminCategoryValue } from '@duncit/category';
import type { AutoPodTableRow } from '../queries';

/** One `PodMediaInput` — an Auto Pod template carries images only (server rule). */
export interface AutoPodMedia {
  url: string;
  type: string;
}

/**
 * What the dialog edits. Media and hashtags are held as plain text because the
 * admin types them: one image URL per line, hashtags separated by spaces or
 * commas. `toAutoPodInput` turns both back into the arrays the server takes.
 */
export interface AutoPodFormValues {
  pod_title: string;
  category: AdminCategoryValue;
  pod_description: string;
  pod_info: string;
  media: string;
  pod_amount: number;
  no_of_spots: number;
  pod_occurrence: string;
  pod_hashtag: string;
  payment_terms: string;
}

const IMAGE = 'IMAGE';

/** Image URLs, one per line — blank lines and stray whitespace dropped. */
export function parseMediaLines(text: string): AutoPodMedia[] {
  return text
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .map((url) => ({ url, type: IMAGE }));
}

/** Hashtags split on commas or whitespace, with any leading # removed. */
export function parseHashtags(text: string): string[] {
  return text
    .split(/[,\s]+/)
    .map((tag) => tag.replace(/^#+/, '').trim())
    .filter((tag) => tag.length > 0);
}

export const emptyAutoPodForm: AutoPodFormValues = {
  pod_title: '',
  category: EMPTY_CATEGORY,
  pod_description: '',
  pod_info: '',
  media: '',
  pod_amount: 1,
  no_of_spots: 2,
  pod_occurrence: 'ONE_TIME',
  pod_hashtag: '',
  payment_terms: '',
};

/** Hydrate the dialog from a table row (the category needs the admin tree). */
export function toAutoPodForm(
  row: AutoPodTableRow,
  category: AdminCategoryValue
): AutoPodFormValues {
  return {
    pod_title: row.pod_title,
    category,
    pod_description: row.pod_description,
    pod_info: row.pod_info ?? '',
    media: row.pod_images_and_videos.map((media) => media.url).join('\n'),
    pod_amount: row.pod_amount,
    no_of_spots: row.no_of_spots,
    pod_occurrence: row.pod_occurrence || 'ONE_TIME',
    pod_hashtag: (row.pod_hashtag ?? []).join(' '),
    payment_terms: row.payment_terms ?? '',
  };
}
