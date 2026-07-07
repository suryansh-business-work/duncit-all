import { z } from 'zod';
import type { ClubFormConfig } from './types';

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

/**
 * Config-driven Zod factory. Ports the admin `validateClub` (clubValidation.ts)
 * 1:1 — identical required fields and identical messages — as a `superRefine`.
 * The config booleans gate which SECTIONS render (see ClubForm), not the core
 * required rules, so every consumer validates the club identically.
 */
export function makeClubSchema(_config: ClubFormConfig) {
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

      if (!values.club_name.trim()) add('club_name', 'Club name is required');
      if (!values.club_description.trim()) add('club_description', 'A short description is required');
      if (!values.super_category_id) add('super_category_id', 'Select a super category');
      if (!values.category_id) add('category_id', 'Select a sub category');
      if (!values.location_id) add('location_id', 'Select the club location');
      if (mediaCount(values.feature_text) < 1) add('feature_text', 'Add at least one feature image');

      if (!values.community_link.trim()) add('community_link', 'WhatsApp community link is required');
      else if (!isLink(values.community_link)) add('community_link', 'Enter a valid link (https://…)');

      if (!values.group_link.trim()) add('group_link', 'WhatsApp group link is required');
      else if (!isLink(values.group_link)) add('group_link', 'Enter a valid link (https://…)');

      if (!hasEntry(values.who_we_are)) add('who_we_are', 'Add at least one "Who we are" point');
      if (!hasEntry(values.what_we_do)) add('what_we_do', 'Add at least one "What we do" point');
      if (!hasEntry(values.perks)) add('perks', 'Add at least one perk');
      if (!hasEntry(values.values)) add('values', 'Add at least one value');
    });
}

export type ClubSchema = ReturnType<typeof makeClubSchema>;
