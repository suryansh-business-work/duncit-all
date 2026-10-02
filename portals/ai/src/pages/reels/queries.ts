import { gql } from '@apollo/client';

/**
 * Reel Studio's GraphQL surface.
 *
 * A reel is selected in full in exactly one document, `REEL_PROJECT`, written
 * out rather than interpolated from a shared constant — an interpolated
 * selection in a `gql` template is invisible to the document verifier.
 */

export const REEL_PROJECTS = gql`
  query ReelProjects {
    reelProjects {
      id
      name
      drive_url
      asset_count
      scene_count
      duration_ms
      created_by
      created_at
      updated_at
    }
  }
`;

export const REEL_PROJECT = gql`
  query ReelProject($id: ID!) {
    reelProject(id: $id) {
      id
      name
      drive_url
      drive_folder_id
      duration_ms
      created_by
      created_at
      updated_at
      assets {
        id
        kind
        source
        name
        mime_type
        drive_file_id
        url
        thumbnail_url
        duration_ms
        width
        height
        size_bytes
      }
      spec {
        fps
        width
        height
        background
        music {
          asset_id
          volume
          trim_start_ms
        }
        scenes {
          id
          asset_id
          duration_ms
          trim_start_ms
          volume
          playback_rate
          fit
          motion
          transition
          transition_ms
          background
          texts {
            id
            text
            position
            style
            animation
            start_ms
            duration_ms
            color
            background
          }
          overlays {
            id
            asset_id
            corner
            width_pct
            opacity
            start_ms
            duration_ms
          }
        }
      }
      messages {
        id
        role
        text
        asset_ids
        restorable
        failed
        at
      }
    }
  }
`;

export const REEL_DRIVE_STATUS = gql`
  query ReelDriveStatus {
    reelDriveStatus {
      configured
      service_account_email
    }
  }
`;

export const REEL_DRIVE_FOLDER = gql`
  query ReelDriveFolder($folder: String!) {
    reelDriveFolder(folder: $folder) {
      id
      name
      truncated
      entries {
        id
        name
        mime_type
        kind
        size_bytes
        duration_ms
        width
        height
        thumbnail_url
      }
    }
  }
`;

export const CREATE_REEL_PROJECT = gql`
  mutation CreateReelProject($input: ReelProjectInput!) {
    createReelProject(input: $input) {
      id
    }
  }
`;

export const UPDATE_REEL_PROJECT = gql`
  mutation UpdateReelProject($id: ID!, $input: ReelProjectInput!) {
    updateReelProject(id: $id, input: $input) {
      id
      name
      drive_url
      drive_folder_id
      updated_at
    }
  }
`;

export const DELETE_REEL_PROJECT = gql`
  mutation DeleteReelProject($id: ID!) {
    deleteReelProject(id: $id)
  }
`;

/**
 * The four mutations that change a reel answer with only its id. Each caller
 * refetches `REEL_PROJECT` afterwards, so the studio has ONE selection of a
 * reel and a field added to it cannot be forgotten in four other documents.
 */
export const ADD_REEL_DRIVE_ASSETS = gql`
  mutation AddReelDriveAssets($project_id: ID!, $file_ids: [ID!]!) {
    addReelDriveAssets(project_id: $project_id, file_ids: $file_ids) {
      id
    }
  }
`;

export const REMOVE_REEL_ASSET = gql`
  mutation RemoveReelAsset($project_id: ID!, $asset_id: ID!) {
    removeReelAsset(project_id: $project_id, asset_id: $asset_id) {
      id
    }
  }
`;

export const SEND_REEL_MESSAGE = gql`
  mutation SendReelMessage($input: ReelMessageInput!) {
    sendReelMessage(input: $input) {
      id
    }
  }
`;

export const RESTORE_REEL_VERSION = gql`
  mutation RestoreReelVersion($project_id: ID!, $message_id: ID!) {
    restoreReelVersion(project_id: $project_id, message_id: $message_id) {
      id
    }
  }
`;
