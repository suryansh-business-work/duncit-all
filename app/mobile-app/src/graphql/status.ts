import { gql } from '@/generated/graphql';

/**
 * Status (story) feed — everyone's active stories plus my own. Stories are
 * ephemeral (24h) and never surface on the profile grid. Mirrors the `stories`
 * /`myStories` data mWeb's HomeStatusRail reads.
 */
export const StatusFeedDocument = gql(`
  query MobileStatusFeed {
    stories {
      id
      author_id
      author {
        user_id
        full_name
        profile_photo
      }
      image_url
      media_type
      caption
      created_at
      expires_at
      seen_by_me
      liked_by_me
      likes_count
    }
    myStories {
      id
      author_id
      image_url
      media_type
      caption
      created_at
      expires_at
      seen_by_me
      liked_by_me
      likes_count
      views_count
    }
  }
`);

/** Records that the viewer opened a story — greys the ring (Bug 2). */
export const RecordStoryViewDocument = gql(`
  mutation MobileRecordStoryView($id: ID!) {
    recordStoryView(post_doc_id: $id) {
      id
      seen_by_me
      views_count
    }
  }
`);

/** Owner-only: who viewed my story, newest first (Bug 4). */
export const StoryViewersDocument = gql(`
  query MobileStoryViewers($id: ID!) {
    storyViewers(post_doc_id: $id) {
      user_id
      viewed_at
      user {
        user_id
        full_name
        profile_photo
      }
    }
  }
`);

/** Uploads a base64 image/document to ImageKit (server holds the private key) → url.
 * Pass `allowDocuments: true` with the real mimeType to upload PDFs/Office/txt/csv.
 * `surface` opts the upload into the admin Upload Settings pipeline (sharp
 * compression, crop presets, AI image monitoring). */
export const UploadImageDocument = gql(`
  mutation MobileUploadImage(
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
    }
  }
`);

/** Admin Upload Settings for a surface — crop presets, size caps and allowed
 * formats the native crop/upload UI honours (MOBILE surface). */
export const UploadSettingsDocument = gql(`
  query MobileUploadSettings($surface: UploadSurface!) {
    uploadSettings(surface: $surface) {
      max_image_mb
      max_video_mb
      allowed_image_formats
      allowed_video_formats
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
`);

/** Starts the server-side FFmpeg compression of an already direct-uploaded
 * ImageKit video; poll MobileVideoCompressionJob for the real percentage.
 * The optional trim window cuts story videos down to the 15s cap. */
export const StartVideoCompressionDocument = gql(`
  mutation MobileStartVideoCompression($remoteUrl: String!, $folder: String, $trimStart: Float, $trimDuration: Float) {
    startVideoCompression(remote_url: $remoteUrl, folder: $folder, surface: "MOBILE", trim_start_seconds: $trimStart, trim_duration_seconds: $trimDuration) {
      job_id
      status
      pct
      url
      error
    }
  }
`);

export const VideoCompressionJobDocument = gql(`
  query MobileVideoCompressionJob($jobId: String!) {
    videoCompressionJob(job_id: $jobId) {
      job_id
      status
      pct
      url
      error
    }
  }
`);

/** Short-lived ImageKit auth so the app can upload a file DIRECTLY to ImageKit
 * (multipart), bypassing the GraphQL API's request-body size limit that blocked
 * large support attachments. The private key never leaves the server. */
export const GetImagekitAuthDocument = gql(`
  mutation MobileGetImagekitAuth {
    getImagekitAuth {
      token
      expire
      signature
      publicKey
      urlEndpoint
    }
  }
`);

/** Publishes a status post from an uploaded image url — mWeb's CREATE_STATUS_POST. */
export const CreatePostDocument = gql(`
  mutation MobileCreatePost($input: CreatePostInput!) {
    createPost(input: $input) {
      id
      image_url
      caption
      created_at
    }
  }
`);
