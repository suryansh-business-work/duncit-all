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
    }
    myStories {
      id
      author_id
      image_url
      media_type
      caption
      created_at
    }
  }
`);

/** Uploads a base64 image to ImageKit (server holds the private key) → url. */
export const UploadImageDocument = gql(`
  mutation MobileUploadImage(
    $fileBase64: String!
    $fileName: String!
    $mimeType: String
    $folder: String
  ) {
    uploadImageToImagekit(
      fileBase64: $fileBase64
      fileName: $fileName
      mimeType: $mimeType
      folder: $folder
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
