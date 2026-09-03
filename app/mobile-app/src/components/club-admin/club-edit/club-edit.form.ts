import { z } from 'zod';

import { CategoryMediaType, type UpdateClubInput } from '@/generated/graphql/graphql';
import type { Translate } from '@/i18n/fallback';

/** One FAQ row. `id` is the row's key while it is being edited — rows are
 * added and removed, so an index is not one — and never leaves the form. */
export interface ClubFaqRow {
  id: string;
  question: string;
  answer: string;
}

/** The club fields a Club Admin edits — everything but governance and the
 * category/location pickers, which the partner flow does not offer. */
export interface ClubEditFormValues {
  club_name: string;
  club_description: string;
  /** Feature images/videos — one URL per line, as the media field serialises. */
  feature_text: string;
  community_link: string;
  group_link: string;
  who_we_are: string[];
  what_we_do: string[];
  perks: string[];
  values: string[];
  faqs: ClubFaqRow[];
}

/** The club as `club(club_doc_id)` answers the fields the form prefills. */
export interface EditableClubFields {
  club_name: string;
  club_description?: string | null;
  club_feature_images_and_videos: readonly { url: string }[];
  club_whats_app_community_link?: string | null;
  club_whats_app_group_link?: string | null;
  who_we_are: readonly string[];
  what_we_do: readonly string[];
  perks: readonly string[];
  values: readonly string[];
  faqs: readonly { question: string; answer: string }[];
}

let faqSeq = 0;
export const nextFaqId = (): string => {
  faqSeq += 1;
  return `faq-${faqSeq}`;
};

const VIDEO_URL_RE = /\.(mp4|mov|webm)$/i;
const isLink = (value: string) => /^https?:\/\/\S+/i.test(value.trim());
const lines = (text: string) =>
  text
    .split('\n')
    .map((item) => item.trim())
    .filter(Boolean);
const hasEntry = (list: string[]) => list.some((item) => item.trim());

/**
 * The required-field rules of @duncit/club-form's `makeClubSchema`, for the
 * fields this form renders. Re-stated here rather than imported because that
 * package is an MUI build the native app does not depend on; the rules are
 * the same, the messages come from the app's own catalogue (rule 38).
 */
export function makeClubEditSchema(t: Translate) {
  return z.object({
    club_name: z.string().trim().min(1, t('mweb.clubEdit.validation.nameRequired')),
    club_description: z.string().trim().min(1, t('mweb.clubEdit.validation.descriptionRequired')),
    feature_text: z
      .string()
      .refine((text) => lines(text).length > 0, t('mweb.clubEdit.validation.imageRequired')),
    community_link: z
      .string()
      .trim()
      .min(1, t('mweb.clubEdit.validation.communityLinkRequired'))
      .refine(isLink, t('mweb.clubEdit.validation.linkInvalid')),
    group_link: z
      .string()
      .trim()
      .min(1, t('mweb.clubEdit.validation.groupLinkRequired'))
      .refine(isLink, t('mweb.clubEdit.validation.linkInvalid')),
    who_we_are: z
      .array(z.string())
      .refine(hasEntry, t('mweb.clubEdit.validation.whoWeAreRequired')),
    what_we_do: z
      .array(z.string())
      .refine(hasEntry, t('mweb.clubEdit.validation.whatWeDoRequired')),
    perks: z.array(z.string()).refine(hasEntry, t('mweb.clubEdit.validation.perksRequired')),
    values: z.array(z.string()).refine(hasEntry, t('mweb.clubEdit.validation.valuesRequired')),
    faqs: z.array(z.object({ id: z.string(), question: z.string(), answer: z.string() })),
  });
}

/** Form values from an existing club — the native `clubToFormValues`. */
export function clubToEditValues(club: EditableClubFields): ClubEditFormValues {
  return {
    club_name: club.club_name,
    club_description: club.club_description ?? '',
    feature_text: club.club_feature_images_and_videos.map((media) => media.url).join('\n'),
    community_link: club.club_whats_app_community_link ?? '',
    group_link: club.club_whats_app_group_link ?? '',
    who_we_are: [...club.who_we_are],
    what_we_do: [...club.what_we_do],
    perks: [...club.perks],
    values: [...club.values],
    faqs: club.faqs.map((faq) => ({ id: nextFaqId(), question: faq.question, answer: faq.answer })),
  };
}

/**
 * The `UpdateClubInput` the save sends — the same shape `buildClubInput`
 * produces for the partner config (no admins, no verified flag, no active
 * toggle). Category and location are not sent, so the server keeps them.
 */
export function buildClubEditInput(values: ClubEditFormValues): UpdateClubInput {
  const clean = (items: string[]) => items.map((item) => item.trim()).filter(Boolean);
  return {
    club_name: values.club_name.trim(),
    club_description: values.club_description.trim(),
    club_feature_images_and_videos: lines(values.feature_text).map((url) => ({
      url,
      type: VIDEO_URL_RE.test(url) ? CategoryMediaType.Video : CategoryMediaType.Image,
    })),
    club_whats_app_community_link: values.community_link.trim(),
    club_whats_app_group_link: values.group_link.trim(),
    who_we_are: clean(values.who_we_are),
    what_we_do: clean(values.what_we_do),
    perks: clean(values.perks),
    values: clean(values.values),
    faqs: values.faqs
      .map((faq) => ({ question: faq.question.trim(), answer: faq.answer.trim() }))
      .filter((faq) => faq.question && faq.answer),
  };
}
