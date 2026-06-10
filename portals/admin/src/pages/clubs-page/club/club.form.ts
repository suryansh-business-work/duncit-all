import * as yup from 'yup';
import { validationRules } from '../../../forms/validation/rules';

const optionalUrl = validationRules.optionalUrl;

export const clubFormSchema = yup.object({
  club_name: yup
    .string()
    .trim()
    .min(2, 'Club name must be at least 2 characters')
    .max(120, 'Club name must be 120 characters or fewer')
    .required('Club name is required'),
  club_description: yup
    .string()
    .trim()
    .max(2000, 'Description must be 2000 characters or fewer')
    .default(''),
  super_category_id: yup.string().trim().default(''),
  category_id: yup.string().trim().default(''),
  is_active: yup.boolean().default(true),
  cover_image_url: optionalUrl('Cover image URL'),
  banner_image_url: optionalUrl('Banner image URL'),
  community_link: optionalUrl('Community link'),
  announcement_link: optionalUrl('Announcement link'),
  group_link: optionalUrl('Group link'),
  meetup_venues_id: yup.array(yup.string().trim().required()).default([]),
  feature_text: yup.string().trim().max(2000).default(''),
  moments_text: yup.string().trim().max(2000).default(''),
  moments_media: yup.array(yup.string().trim().required()).max(50).default([]),
});

export type ClubFormValues = yup.InferType<typeof clubFormSchema>;

export interface CreateClubInput {
  club_name: string;
  club_description: string | null;
  super_category_id: string | null;
  category_id: string | null;
  cover_image_url: string | null;
  banner_image_url: string | null;
  community_link: string | null;
  announcement_link: string | null;
  group_link: string | null;
  meetup_venues_id: string[];
  feature_text: string | null;
  moments_text: string | null;
  moments_media: string[];
}

export function toCreateClubInput(values: ClubFormValues): CreateClubInput {
  const cast = clubFormSchema.cast(values, { stripUnknown: true });
  return {
    club_name: cast.club_name,
    club_description: cast.club_description || null,
    super_category_id: cast.super_category_id || null,
    category_id: cast.category_id || null,
    cover_image_url: cast.cover_image_url || null,
    banner_image_url: cast.banner_image_url || null,
    community_link: cast.community_link || null,
    announcement_link: cast.announcement_link || null,
    group_link: cast.group_link || null,
    meetup_venues_id: cast.meetup_venues_id,
    feature_text: cast.feature_text || null,
    moments_text: cast.moments_text || null,
    moments_media: cast.moments_media,
  };
}

export function toUpdateClubInput(values: ClubFormValues) {
  return { ...toCreateClubInput(values), is_active: values.is_active };
}
