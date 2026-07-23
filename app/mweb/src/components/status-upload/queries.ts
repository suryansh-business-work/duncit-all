import { gql } from '@apollo/client';

export const UPLOAD_STATUS_MEDIA = gql`
  mutation UploadStatusMedia(
    $fileBase64: String!
    $fileName: String!
    $mimeType: String
    $folder: String
    $crop: UploadCropRectInput
    $cropPreset: String
  ) {
    uploadImageToImagekit(
      fileBase64: $fileBase64
      fileName: $fileName
      mimeType: $mimeType
      folder: $folder
      surface: "MWEB"
      crop: $crop
      crop_preset: $cropPreset
    ) {
      url
      fileId
    }
  }
`;

export const CREATE_STATUS_POST = gql`
  mutation CreateStatusPost($input: CreatePostInput!) {
    createPost(input: $input) {
      id
      image_url
      created_at
    }
  }
`;

export const ADD_POD_STATUS = gql`
  mutation AddPodStatus($podId: ID!, $media: PodMediaInput!) {
    addPodStatus(pod_doc_id: $podId, media: $media) {
      id
      pod_images_and_videos {
        url
        type
      }
    }
  }
`;