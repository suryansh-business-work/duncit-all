import { gql } from '@apollo/client';

export const UPLOAD_IMAGE = gql`
  mutation UploadImageToImagekit(
    $fileBase64: String!
    $fileName: String!
    $mimeType: String
    $folder: String
    $allowDocuments: Boolean
  ) {
    uploadImageToImagekit(
      fileBase64: $fileBase64
      fileName: $fileName
      mimeType: $mimeType
      folder: $folder
      allow_documents: $allowDocuments
    ) {
      url
      fileId
    }
  }
`;

export const PEXELS_SEARCH = gql`
  query PexelsSearch($query: String, $page: Int, $perPage: Int, $orientation: String) {
    pexelsSearch(query: $query, page: $page, perPage: $perPage, orientation: $orientation) {
      page
      next_page
      photos {
        id
        photographer
        photographer_url
        avg_color
        alt
        src_large
        src_medium
        src_tiny
      }
    }
  }
`;

export const IMPORT_REMOTE = gql`
  mutation ImportRemoteImage($remoteUrl: String!, $folder: String) {
    importRemoteImageToImagekit(remoteUrl: $remoteUrl, folder: $folder) {
      url
      fileId
    }
  }
`;

export const PEXELS_VIDEO_SEARCH = gql`
  query PexelsVideoSearch($query: String, $page: Int, $perPage: Int, $orientation: String) {
    pexelsSearchVideos(query: $query, page: $page, perPage: $perPage, orientation: $orientation) {
      page
      next_page
      videos {
        id
        width
        height
        duration
        preview
        image
        user_name
        video_files {
          id
          quality
          width
          height
          link
        }
      }
    }
  }
`;

export const IMPORT_REMOTE_MEDIA = gql`
  mutation ImportRemoteMedia($remoteUrl: String!, $folder: String) {
    importRemoteMediaToImagekit(remoteUrl: $remoteUrl, folder: $folder) {
      url
      fileId
    }
  }
`;
