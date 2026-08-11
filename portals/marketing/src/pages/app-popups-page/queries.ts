import { gql } from '@apollo/client';

export type AppPopupPlatform = 'IOS' | 'ANDROID' | 'BOTH';
export type AppPopupAudience = 'ALL_USERS' | 'AUDIENCE_LIST';

/** Row shape for the App Popups table. */
export interface AppPopupRow {
  id: string;
  name: string;
  image_url: string;
  start_at: string;
  end_at: string;
  enabled: boolean;
  platform: AppPopupPlatform;
  close_button_enabled: boolean;
  cta_label: string;
  cta_url: string;
  audience_type: AppPopupAudience;
  audience_list_id?: string | null;
  created_at: string;
  updated_at: string;
}

const APP_POPUP_FIELDS = gql`
  fragment AppPopupFields on AppPopup {
    id
    name
    image_url
    start_at
    end_at
    enabled
    platform
    close_button_enabled
    cta_label
    cta_url
    audience_type
    audience_list_id
    created_at
    updated_at
  }
`;

/** Server-side table page (search/sort/filter/paginate) for the popups table. */
export const APP_POPUPS_TABLE = gql`
  query AppPopupsTable($query: TableQueryInput) {
    appPopupsTable(query: $query) {
      total
      rows {
        ...AppPopupFields
      }
    }
  }
  ${APP_POPUP_FIELDS}
`;

/** Saved Target Audience lists, offered as the popup's audience. Each carries
 * the number of people it reaches right now — the criteria are re-run server-side. */
export const AUDIENCE_LISTS_FOR_POPUP = gql`
  query AudienceListsForPopup {
    audienceLists {
      id
      name
      member_count
    }
  }
`;

export const CREATE_APP_POPUP = gql`
  mutation CreateAppPopup($input: AppPopupInput!) {
    createAppPopup(input: $input) {
      ...AppPopupFields
    }
  }
  ${APP_POPUP_FIELDS}
`;

export const UPDATE_APP_POPUP = gql`
  mutation UpdateAppPopup($id: ID!, $input: AppPopupInput!) {
    updateAppPopup(id: $id, input: $input) {
      ...AppPopupFields
    }
  }
  ${APP_POPUP_FIELDS}
`;

export const DELETE_APP_POPUP = gql`
  mutation DeleteAppPopup($id: ID!) {
    deleteAppPopup(id: $id)
  }
`;
