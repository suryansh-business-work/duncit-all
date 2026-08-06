import { gql } from '@apollo/client';

/** One file as the manager renders it — ImageKit's record, read server-side. */
export interface MediaItem {
  fileId: string;
  name: string;
  filePath: string;
  url: string;
  thumbnail?: string | null;
  type: string;
  fileType?: string | null;
  mime?: string | null;
  size: number;
  width?: number | null;
  height?: number | null;
  tags: string[];
  createdAt?: string | null;
  updatedAt?: string | null;
  versionId?: string | null;
}

const FIELDS = `
  fileId
  name
  filePath
  url
  thumbnail
  type
  fileType
  mime
  size
  width
  height
  tags
  createdAt
  updatedAt
  versionId
`;

export const MEDIA_FILES = gql`
  query MediaFiles($search: String, $fileType: String, $skip: Int, $limit: Int, $sort: String) {
    mediaFiles(search: $search, fileType: $fileType, skip: $skip, limit: $limit, sort: $sort) {
      ${FIELDS}
    }
  }
`;

export const MEDIA_FILE = gql`
  query MediaFile($fileId: ID!) {
    mediaFile(fileId: $fileId) {
      ${FIELDS}
    }
  }
`;

export const DELETE_MEDIA_FILES = gql`
  mutation DeleteMediaFiles($fileIds: [ID!]!) {
    deleteMediaFiles(fileIds: $fileIds)
  }
`;

export const RENAME_MEDIA_FILE = gql`
  mutation RenameMediaFile($fileId: ID!, $newFileName: String!, $purgeCache: Boolean) {
    renameMediaFile(fileId: $fileId, newFileName: $newFileName, purgeCache: $purgeCache) {
      ${FIELDS}
    }
  }
`;

export const UPDATE_MEDIA_FILE = gql`
  mutation UpdateMediaFile($fileId: ID!, $tags: [String!]) {
    updateMediaFile(fileId: $fileId, tags: $tags) {
      ${FIELDS}
    }
  }
`;

/** ImageKit's own sort values, in the order a person would want them. */
export const SORT_OPTIONS = [
  { value: 'DESC_CREATED', label: 'Newest first' },
  { value: 'ASC_CREATED', label: 'Oldest first' },
  { value: 'ASC_NAME', label: 'Name A–Z' },
  { value: 'DESC_NAME', label: 'Name Z–A' },
  { value: 'DESC_SIZE', label: 'Largest first' },
  { value: 'ASC_SIZE', label: 'Smallest first' },
];

export const FILE_TYPE_OPTIONS = [
  { value: '', label: 'Everything' },
  { value: 'image', label: 'Images' },
  { value: 'non-image', label: 'Other files' },
];

/** A page big enough to scroll, small enough to arrive quickly. */
export const PAGE_SIZE = 40;
