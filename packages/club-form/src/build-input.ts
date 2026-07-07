import { blankClubFormValues, type ClubFaqValue, type ClubFormConfig, type ClubFormValues } from './types';

/** Newline text → trimmed non-empty lines. */
const lines = (text: string) =>
  text
    .split('\n')
    .map((s) => s.trim())
    .filter(Boolean);

/** Newline-separated URLs → GraphQL ClubMediaInput list (image/video by extension). */
export const linesToMedia = (text: string) =>
  lines(text).map((url) => ({ url, type: /\.(mp4|mov|webm)$/i.test(url) ? 'VIDEO' : 'IMAGE' }));

/** Trim + drop empty bullet entries. */
export const cleanBullets = (items: string[]) => items.map((item) => item.trim()).filter(Boolean);

/** Trim FAQ pairs and drop any missing a question or answer. */
export const cleanFaqs = (items: ClubFaqValue[]) =>
  items
    .map((faq) => ({ question: faq.question.trim(), answer: faq.answer.trim() }))
    .filter((faq) => faq.question && faq.answer);

export interface BuildClubInputOptions {
  /** A draft create stays inactive; ignored on update. */
  draft?: boolean;
  config: ClubFormConfig;
}

/**
 * Build a Create/UpdateClubInput from the form values. Governance fields
 * (admin_user_ids, is_verified) are only included when their section is shown;
 * `is_active` follows the admin rules — create uses `!draft`, edit keeps the
 * toggled value. Never mutates server field names.
 */
export function buildClubInput(values: ClubFormValues, { draft = false, config }: BuildClubInputOptions) {
  const isEdit = !!values.id;

  const input: Record<string, unknown> = {
    club_name: values.club_name.trim(),
    club_description: values.club_description,
    club_feature_images_and_videos: linesToMedia(values.feature_text),
    club_moments: linesToMedia(values.moments_text),
    club_whats_app_community_link: values.community_link,
    club_whats_app_group_link: values.group_link,
    who_we_are: cleanBullets(values.who_we_are),
    what_we_do: cleanBullets(values.what_we_do),
    perks: cleanBullets(values.perks),
    values: cleanBullets(values.values),
    faqs: cleanFaqs(values.faqs),
    location_id: values.location_id || null,
    locality: values.locality,
    category_id: values.category_id || null,
    super_category_id: values.super_category_id || null,
    is_active: isEdit ? values.is_active : !draft,
  };

  if (config.showAdmins) input.admin_user_ids = values.admin_user_ids;
  if (config.showVerified) input.is_verified = values.is_verified;
  if (!isEdit) input.club_id = values.club_id || undefined;

  return input;
}

/** Build RHF form values from an existing Club so the form can prefill for edit. */
export function clubToFormValues(club: any): ClubFormValues {
  return {
    ...blankClubFormValues,
    id: club.id,
    club_id: club.club_id ?? '',
    club_name: club.club_name ?? '',
    club_description: club.club_description ?? '',
    super_category_id: club.super_category_id ?? '',
    category_id: club.category_id ?? '',
    location_id: club.location_id ?? '',
    locality: club.locality ?? '',
    feature_text: (club.club_feature_images_and_videos ?? []).map((m: any) => m.url).join('\n'),
    moments_text: (club.club_moments ?? []).map((m: any) => m.url).join('\n'),
    community_link: club.club_whats_app_community_link ?? '',
    group_link: club.club_whats_app_group_link ?? '',
    who_we_are: club.who_we_are ?? [],
    what_we_do: club.what_we_do ?? [],
    perks: club.perks ?? [],
    values: club.values ?? [],
    faqs: (club.faqs ?? []).map((f: any) => ({ question: f.question, answer: f.answer })),
    admin_user_ids: club.admin_user_ids ?? [],
    is_verified: club.is_verified ?? false,
    is_active: club.is_active ?? true,
  };
}
