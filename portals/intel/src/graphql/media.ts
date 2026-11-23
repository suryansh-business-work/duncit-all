import { gql } from '@apollo/client';
import type { IntelMedia, IntelMediaPage } from '@duncit/gql-types';

/** Media Manager documents. */

export const MEDIA_FIELDS = gql`
  fragment IntelMediaFields on IntelMedia {
    id
    owner_id
    name
    folder
    mime
    size
    visibility
    favorite
    archived
    deleted
    index_status
    index_method
    index_warning
    page_count
    chunk_count
    indexed_at
    created_at
    updated_at
  }
`;

export const INTEL_MEDIA = gql`
  query IntelMedia($view: String, $folder: String, $search: String, $page: Int, $page_size: Int) {
    intelMedia(view: $view, folder: $folder, search: $search, page: $page, page_size: $page_size) {
      total
      rows {
        ...IntelMediaFields
      }
    }
    intelMediaFolders
  }
  ${MEDIA_FIELDS}
`;

export const INTEL_UPDATE_MEDIA = gql`
  mutation IntelUpdateMedia($id: ID!, $patch: IntelMediaPatch!) {
    intelUpdateMedia(id: $id, patch: $patch) {
      ...IntelMediaFields
    }
  }
  ${MEDIA_FIELDS}
`;

export const INTEL_ARCHIVE_MEDIA = gql`
  mutation IntelArchiveMedia($id: ID!, $archived: Boolean!) {
    intelArchiveMedia(id: $id, archived: $archived) {
      ...IntelMediaFields
    }
  }
  ${MEDIA_FIELDS}
`;

export const INTEL_TRASH_MEDIA = gql`
  mutation IntelTrashMedia($id: ID!) {
    intelTrashMedia(id: $id) {
      ...IntelMediaFields
    }
  }
  ${MEDIA_FIELDS}
`;

export const INTEL_RESTORE_MEDIA = gql`
  mutation IntelRestoreMedia($id: ID!) {
    intelRestoreMedia(id: $id) {
      ...IntelMediaFields
    }
  }
  ${MEDIA_FIELDS}
`;

export const INTEL_REINDEX_MEDIA = gql`
  mutation IntelReindexMedia($id: ID!) {
    intelReindexMedia(id: $id) {
      ...IntelMediaFields
    }
  }
  ${MEDIA_FIELDS}
`;

export const INTEL_PURGE_MEDIA = gql`
  mutation IntelPurgeMedia($id: ID!) {
    intelPurgeMedia(id: $id)
  }
`;

export const INTEL_CREATE_FOLDER = gql`
  mutation IntelCreateFolder($path: String!) {
    intelCreateFolder(path: $path)
  }
`;

export const INTEL_MEDIA_FILE = gql`
  query IntelMediaFile($id: ID!) {
    intelMediaFile(id: $id) {
      ...IntelMediaFields
    }
  }
  ${MEDIA_FIELDS}
`;

export interface MediaFileData {
  intelMediaFile: IntelMedia;
}

export interface MediaData {
  intelMedia: IntelMediaPage;
  intelMediaFolders: string[];
}

export type { IntelMedia };
