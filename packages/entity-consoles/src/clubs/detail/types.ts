import { isVideoMedia as isVideoMediaRow } from '@duncit/utils';

/** Shared shapes for the admin Club Details page (query result subset). */

export interface ClubMedia {
  url: string;
  type?: string | null;
}

export interface ClubFaq {
  question: string;
  answer: string;
}

export interface ClubActor {
  id: string;
  name: string;
  avatar_url?: string | null;
}

export interface ClubDetail {
  id: string;
  club_id: string;
  club_name: string;
  club_description?: string | null;
  is_verified: boolean;
  is_active: boolean;
  locality?: string | null;
  followers_count: number;
  matched_venues_count: number;
  rating: number;
  ratings_count: number;
  club_whats_app_community_link?: string | null;
  club_whats_app_group_link?: string | null;
  who_we_are: string[];
  what_we_do: string[];
  perks: string[];
  values: string[];
  faqs: ClubFaq[];
  club_feature_images_and_videos: ClubMedia[];
  club_moments: ClubMedia[];
  admin_user_ids: string[];
  club_admins: ClubActor[];
  /** Only the ids: the Hosts tab reads the host RECORDS they name. */
  hosts: Pick<ClubActor, 'id'>[];
}

/** True when a media item should render as a playable video. */
export const isVideoMedia = (media: ClubMedia): boolean => isVideoMediaRow(media);
