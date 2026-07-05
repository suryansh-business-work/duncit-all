import type { ClubForm } from '../queries';

export type ClubErrors = Partial<Record<string, string>>;

const isLink = (value: string) => /^https?:\/\/\S+/i.test(value.trim());
const mediaCount = (text: string) => text.split('\n').filter((line) => line.trim()).length;
const hasEntry = (list: string[]) => list.some((item) => item.trim());

/** Which accordion section each field lives in — so a failed submit can open
 * the first section with an error. */
export const SECTION_OF: Record<string, string> = {
  club_name: 'basic',
  club_description: 'basic',
  super_category_id: 'basic',
  category_id: 'basic',
  location_id: 'basic',
  feature_text: 'media',
  community_link: 'venues',
  group_link: 'venues',
  who_we_are: 'content',
  what_we_do: 'content',
  perks: 'content',
  values: 'content',
};

/** Full Club validation — every field is required (name, description, category,
 * location, ≥1 feature image, WhatsApp community + group links, and each page-
 * content list). Returns a { field: message } map; empty means valid. */
export function validateClub(form: ClubForm): ClubErrors {
  const e: ClubErrors = {};
  if (!form.club_name.trim()) e.club_name = 'Club name is required';
  if (!form.club_description.trim()) e.club_description = 'A short description is required';
  if (!form.super_category_id) e.super_category_id = 'Select a super category';
  if (!form.category_id) e.category_id = 'Select a sub category';
  if (!form.location_id) e.location_id = 'Select the club location';
  if (mediaCount(form.feature_text) < 1) e.feature_text = 'Add at least one feature image';
  if (!form.community_link.trim()) e.community_link = 'WhatsApp community link is required';
  else if (!isLink(form.community_link)) e.community_link = 'Enter a valid link (https://…)';
  if (!form.group_link.trim()) e.group_link = 'WhatsApp group link is required';
  else if (!isLink(form.group_link)) e.group_link = 'Enter a valid link (https://…)';
  if (!hasEntry(form.who_we_are)) e.who_we_are = 'Add at least one "Who we are" point';
  if (!hasEntry(form.what_we_do)) e.what_we_do = 'Add at least one "What we do" point';
  if (!hasEntry(form.perks)) e.perks = 'Add at least one perk';
  if (!hasEntry(form.values)) e.values = 'Add at least one value';
  return e;
}

/** The section id of the first field with an error (for auto-expanding it). */
export function firstErrorSection(errors: ClubErrors): string | null {
  const key = Object.keys(errors)[0];
  return key ? (SECTION_OF[key] ?? null) : null;
}
