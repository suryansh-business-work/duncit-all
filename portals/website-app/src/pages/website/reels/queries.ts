import { gql } from '@apollo/client';
import type { WebsiteReel, WebsiteReelSettings } from '@duncit/gql-types';

const REEL_FIELDS = gql`
  fragment WebsiteReelFields on WebsiteReel {
    id
    site
    title
    description
    video_url
    file_size_bytes
    sort_order
    is_active
    created_at
  }
`;

export const WEBSITE_REELS_TABLE = gql`
  query WebsiteReelsTable($query: TableQueryInput) {
    websiteReelsTable(query: $query) {
      total
      rows {
        ...WebsiteReelFields
      }
    }
  }
  ${REEL_FIELDS}
`;

export const CREATE_WEBSITE_REEL = gql`
  mutation CreateWebsiteReel($input: WebsiteReelInput!) {
    createWebsiteReel(input: $input) {
      id
    }
  }
`;

export const UPDATE_WEBSITE_REEL = gql`
  mutation UpdateWebsiteReel($id: ID!, $input: WebsiteReelInput!) {
    updateWebsiteReel(reel_id: $id, input: $input) {
      id
    }
  }
`;

export const DELETE_WEBSITE_REEL = gql`
  mutation DeleteWebsiteReel($id: ID!) {
    deleteWebsiteReel(reel_id: $id)
  }
`;

export const WEBSITE_REEL_SETTINGS = gql`
  query WebsiteReelSettings {
    websiteReelSettings {
      max_reel_mb
      max_reels
      updated_at
    }
  }
`;

export const UPDATE_WEBSITE_REEL_SETTINGS = gql`
  mutation UpdateWebsiteReelSettings($input: WebsiteReelSettingsInput!) {
    updateWebsiteReelSettings(input: $input) {
      max_reel_mb
      max_reels
      updated_at
    }
  }
`;

/** The fields the reels table selects (no `updated_at`). */
export type WebsiteReelRow = Omit<WebsiteReel, 'updated_at'>;

export interface WebsiteReelSettingsData {
  websiteReelSettings: WebsiteReelSettings;
}
