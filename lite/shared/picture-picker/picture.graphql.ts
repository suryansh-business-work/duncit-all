import { gql } from '@apollo/client';

export type PictureOrientation = 'LANDSCAPE' | 'PORTRAIT' | 'SQUARE';

export interface LitePictureOptions {
  pexels_ready: boolean;
  topics: string[];
  previous_covers: string[];
  max_mb: number;
}

export interface LitePexelsPhoto {
  id: string;
  alt: string;
  photographer: string;
  avg_color: string | null;
  thumb_url: string;
}

export interface LitePexelsPage {
  photos: LitePexelsPhoto[];
  page: number;
  has_more: boolean;
}

export interface LitePexelsSearchVars {
  query: string | null;
  orientation: PictureOrientation | null;
  page: number;
}

export const LITE_PICTURE_OPTIONS = gql`
  query LitePictureOptions {
    litePictureOptions {
      pexels_ready
      topics
      previous_covers
      max_mb
    }
  }
`;

export const LITE_PEXELS_SEARCH = gql`
  query LitePexelsSearch($query: String, $orientation: LitePictureOrientation, $page: Int) {
    litePexelsSearch(query: $query, orientation: $orientation, page: $page) {
      photos {
        id
        alt
        photographer
        avg_color
        thumb_url
      }
      page
      has_more
    }
  }
`;

export const LITE_IMPORT_PEXELS_PHOTO = gql`
  mutation LiteImportPexelsPhoto($id: ID!) {
    liteImportPexelsPhoto(id: $id) {
      url
    }
  }
`;
