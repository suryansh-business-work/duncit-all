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
 * Pass `allowDocuments: true` with the real mimeType to upload PDFs/Office/txt/csv. */
export const UploadImageDocument = gql(`
  mutation MobileUploadImage(
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
