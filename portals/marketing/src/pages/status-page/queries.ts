import { gql } from '@apollo/client';

export type OfficialStatusScope = 'GLOBAL' | 'LOCATION';
export type OfficialStatusExpiry = 'HOURS_24' | 'NEVER' | 'CUSTOM';
export type OfficialStatusMediaType = 'IMAGE' | 'VIDEO';

/** Row shape for the Marketing > Status table. */
export interface OfficialStatusRow {
  id: string;
  title: string;
  media_url: string;
  media_type: OfficialStatusMediaType;
  caption: string;
  link_url: string;
  scope: OfficialStatusScope;
  location_ids: string[];
  location_names: string[];
  /** Null means it never expires. */
  expires_at?: string | null;
  is_active: boolean;
  is_live: boolean;
  view_count: number;
  created_by: string;
  created_at: string;
  updated_at: string;
}

/** A city a status can be published to. */
export interface StatusLocationOption {
  id: string;
  location_name: string;
}

const OFFICIAL_STATUS_FIELDS = gql`
  fragment OfficialStatusFields on OfficialStatus {
    id
    title
    media_url
    media_type
    caption
    link_url
    scope
    location_ids
    location_names
    expires_at
    is_active
    is_live
    view_count
    created_by
    created_at
    updated_at
  }
`;

/** Server-side table page (search/sort/filter/paginate) for the status table. */
export const OFFICIAL_STATUSES_TABLE = gql`
  query OfficialStatusesTable($query: TableQueryInput) {
    officialStatusesTable(query: $query) {
      total
      rows {
        ...OfficialStatusFields
      }
    }
  }
  ${OFFICIAL_STATUS_FIELDS}
`;

/** The cities a LOCATION-scoped status can be published to. */
export const LOCATIONS_FOR_STATUS = gql`
  query LocationsForStatus {
    locations {
      id
      location_name
    }
  }
`;

export const CREATE_OFFICIAL_STATUS = gql`
  mutation CreateOfficialStatus($input: OfficialStatusInput!) {
    createOfficialStatus(input: $input) {
      ...OfficialStatusFields
    }
  }
  ${OFFICIAL_STATUS_FIELDS}
`;

export const UPDATE_OFFICIAL_STATUS = gql`
  mutation UpdateOfficialStatus($id: ID!, $input: OfficialStatusInput!) {
    updateOfficialStatus(status_doc_id: $id, input: $input) {
      ...OfficialStatusFields
    }
  }
  ${OFFICIAL_STATUS_FIELDS}
`;

export const DELETE_OFFICIAL_STATUS = gql`
  mutation DeleteOfficialStatus($id: ID!) {
    deleteOfficialStatus(status_doc_id: $id)
  }
`;
