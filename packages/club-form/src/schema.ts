import { z } from 'zod';
import type { ClubFormConfig, ClubFormValues } from './types';

/** True when the value is an http(s) link. Mirrors the admin `isLink`. */
const isLink = (value: string) => /^https?:\/\/\S+/i.test(value.trim());
/** Non-empty newline-separated media entries. Mirrors the admin `mediaCount`. */
const mediaCount = (text: string) => text.split('\n').filter((line) => line.trim()).length;
/** At least one non-blank entry in a bullet list. Mirrors the admin `hasEntry`. */
const hasEntry = (list: string[]) => list.some((item) => item.trim());

const faqSchema = z.object({
  question: z.string().default(''),
  answer: z.string().default(''),
});

/** Plain "this text is required" fields, in their declared order. */
const REQUIRED_TEXT: ReadonlyArray<readonly [field: 'club_name' | 'club_description', message: string]> = [
  ['club_name', 'Club name is required'],
  ['club_description', 'A short description is required'],
];

/** Pick-one fields (ids from a picker). */
const REQUIRED_IDS: ReadonlyArray<
  readonly [field: 'super_category_id' | 'category_id' | 'location_id', message: string]
> = [
  ['super_category_id', 'Select a super category'],
  ['category_id', 'Select a sub category'],
  ['location_id', 'Select the club location'],
];

/** WhatsApp links: required AND well-formed. */
const REQUIRED_LINKS: ReadonlyArray<readonly [field: 'community_link' | 'group_link', label: string]> = [
  ['community_link', 'WhatsApp community link is required'],
  ['group_link', 'WhatsApp group link is required'],
];

/** Bullet lists that need at least one non-blank entry. */
const REQUIRED_BULLETS: ReadonlyArray<
  readonly [field: 'who_we_are' | 'what_we_do' | 'perks' | 'values', message: string]
> = [
  ['who_we_are', 'Add at least one "Who we are" point'],
  ['what_we_do', 'Add at least one "What we do" point'],
  ['perks', 'Add at least one perk'],
  ['values', 'Add at least one value'],
];

type AddIssue = (field: string, message: string) => void;

/** The required-field rules every consumer shares, ported 1:1 from the admin
 * `validateClub`. Kept out of the `superRefine` closure so the config-dependent
 * rules beside it stay readable. */
function addCoreIssues(values: ClubFormValues, add: AddIssue) {
  for (const [field, message] of REQUIRED_TEXT) {
    if (!values[field].trim()) add(field, message);
  }
  for (const [field, message] of REQUIRED_IDS) {
    if (!values[field]) add(field, message);
  }
  for (const [field, message] of REQUIRED_BULLETS) {
    if (!hasEntry(values[field])) add(field, message);
  }
  for (const [field, missingMessage] of REQUIRED_LINKS) {
    const link = values[field];
    if (!link.trim()) add(field, missingMessage);
    else if (!isLink(link)) add(field, 'Enter a valid link (https://…)');
  }
  if (mediaCount(values.feature_text) < 1) add('feature_text', 'Add at least one feature image');
}

/**
 * Config-driven Zod factory. Ports the admin `validateClub` (clubValidation.ts)
 * 1:1 — identical required fields and identical messages — as a `superRefine`.
 * The config booleans gate which SECTIONS render (see ClubForm); the core
 * required rules are shared, so every consumer validates the club identically.
 *
 * The one config-dependent rule is the Club Admin: it is required, but only for
 * the surfaces that actually render the picker (`showAdmins`). The partner /
 * club-admin edit flow hides that section AND omits admin_user_ids from its
 * submit (build-input.ts), so demanding it there would be an error the user can
 * neither see nor clear.
 */
export function makeClubSchema(config: ClubFormConfig) {
  return z
    .object({
      id: z.string().optional(),
      club_id: z.string().default(''),
      club_name: z.string().default(''),
      club_description: z.string().default(''),
      super_category_id: z.string().default(''),
      category_id: z.string().default(''),
      location_id: z.string().default(''),
      locality: z.string().default(''),
      feature_text: z.string().default(''),
      moments_text: z.string().default(''),
      community_link: z.string().default(''),
      group_link: z.string().default(''),
      who_we_are: z.array(z.string()).default([]),
      what_we_do: z.array(z.string()).default([]),
      perks: z.array(z.string()).default([]),
      values: z.array(z.string()).default([]),
      faqs: z.array(faqSchema).default([]),
      admin_user_ids: z.array(z.string()).default([]),
      is_verified: z.boolean().default(false),
      is_active: z.boolean().default(true),
    })
    .superRefine((values, ctx) => {
      const add = (path: string, message: string) =>
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: [path], message });

      addCoreIssues(values, add);

      // Every club is administered by exactly one user.
      if (config.showAdmins && !values.admin_user_ids.some((id) => id.trim())) {
        add('admin_user_ids', 'Assign a Club Admin');
      }
    });
}

export type ClubSchema = ReturnType<typeof makeClubSchema>;
