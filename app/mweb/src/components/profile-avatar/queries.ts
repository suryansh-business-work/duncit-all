import { gql } from '@apollo/client';

/** The signed-in user's own active stories (item 12 — drives ring + viewer). */
export const MY_STORIES = gql`
  query MyStories {
    myStories {
      id
      image_url
      media_type
      caption
      created_at
      expires_at
    }
  }
`;

/** Upload a base64 image to ImageKit (mirrors the media picker mutation). */
export const UPLOAD_AVATAR_IMAGE = gql`
  mutation UploadAvatarImage(
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
`;

/** Persist (or clear) the profile photo. */
export const UPDATE_PROFILE_PHOTO = gql`
  mutation UpdateProfilePhoto($input: UpdateMyProfileInput!) {
    updateMyProfile(input: $input) {
      user_id
      profile_photo
    }
  }
`;

/** Publish a story from an uploaded image (item 12 — Add Story). */
export const CREATE_STORY = gql`
  mutation CreateStory($input: CreatePostInput!) {
    createPost(input: $input) {
      id
    }
  }
`;

/** Delete one of my own stories (item 12). */
export const DELETE_STORY = gql`
  mutation DeleteStory($id: ID!) {
    deletePost(post_doc_id: $id)
  }
`;
