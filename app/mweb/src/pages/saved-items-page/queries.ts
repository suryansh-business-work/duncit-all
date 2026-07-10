import { gql } from '@apollo/client';

/** Saved pods with server-side search + category filter + sort. */
export const SAVED_ITEMS = gql`
  query SavedItems($search: String, $categoryId: ID, $sort: SavedPodSort) {
    mySavedPods(search: $search, category_id: $categoryId, sort: $sort) {
      id
      pod_id
      club_slug
      pod_title
      pod_description
      pod_date_time
      zone_name
      pod_type
      pod_amount
      pod_images_and_videos {
        url
        type
      }
    }
  }
`;

/** The category tree used to build the Super → Category → Sub filter. */
export const SAVED_CATEGORIES = gql`
  query SavedCategories {
    categories {
      id
      name
      slug
      level
      parent_id
    }
  }
`;

export type CategoryLevel = 'SUPER' | 'CATEGORY' | 'SUB';

export interface SavedCategory {
  id: string;
  name: string;
  slug: string;
  level: CategoryLevel;
  parent_id: string | null;
}

export interface SavedPod {
  id: string;
  pod_id: string;
  club_slug?: string | null;
  pod_title: string;
  pod_description?: string | null;
  pod_date_time?: string | null;
  zone_name?: string | null;
  pod_type?: string | null;
  pod_amount?: number | null;
  pod_images_and_videos?: Array<{ url: string; type: string }> | null;
}
