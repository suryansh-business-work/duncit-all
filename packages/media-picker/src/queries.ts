import { gql } from '@apollo/client';

export const UPLOAD_IMAGE = gql`
  mutation UploadImageToImagekit(
    $fileBase64: String!
    $fileName: String!
    $mimeType: String
    $folder: String
    $allowDocuments: Boolean
    $surface: String
    $crop: UploadCropRectInput
    $cropPreset: String
  ) {
    uploadImageToImagekit(
      fileBase64: $fileBase64
      fileName: $fileName
      mimeType: $mimeType
      folder: $folder
      allow_documents: $allowDocuments
      surface: $surface
      crop: $crop
      crop_preset: $cropPreset
    ) {
      url
      fileId
      thumbnailUrl
    }
  }
`;

/** Admin-managed upload rules (sizes, formats, crop presets) per surface. */
export const UPLOAD_SETTINGS = gql`
  query UploadSettings($surface: UploadSurface!) {
    uploadSettings(surface: $surface) {
      id
      surface
      max_image_mb
      max_video_mb
      allowed_image_formats
      allowed_video_formats
      image_compression_enabled
      image_quality
      image_max_dimension
      video_compression_enabled
      video_crf
      video_max_height
      ai_image_monitoring_enabled
      default_crop_key
      crop_presets {
        key
        label
        width
        height
        enabled
      }
    }
  }
`;

export const START_VIDEO_COMPRESSION = gql`
  mutation StartVideoCompression($remoteUrl: String!, $folder: String, $surface: String) {
    startVideoCompression(remote_url: $remoteUrl, folder: $folder, surface: $surface) {
      job_id
      status
      pct
      url
      error
    }
  }
`;

export const VIDEO_COMPRESSION_JOB = gql`
  query VideoCompressionJob($jobId: String!) {
    videoCompressionJob(job_id: $jobId) {
      job_id
      status
      pct
      url
      error
    }
  }
`;

/**
 * Short-lived signed auth so the browser can upload a file DIRECTLY to
 * ImageKit, bypassing the API request-body size limit. The private key never
 * leaves the server. Used by useImagekitDirectUpload (large support videos).
 */
export const GET_IMAGEKIT_AUTH = gql`
  mutation GetImagekitAuth {
    getImagekitAuth {
      token
      expire
      signature
      publicKey
      urlEndpoint
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
