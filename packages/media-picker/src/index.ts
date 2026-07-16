export { default } from './MediaPickerDialog';
export { default as MediaPickerDialog } from './MediaPickerDialog';
export { pickBestVideoFile, validateFile } from './utils';
export type { MediaPickerDialogProps, Orientation, FilePolicy } from './types';

// ImageKit upload plumbing (shared by all portals — do not hand-roll the gql doc).
export { UPLOAD_IMAGE, GET_IMAGEKIT_AUTH } from './queries';
export { uploadImageToImagekit, useImagekitBase64Upload } from './upload';
export type { ImagekitUploadResult, UploadImageOptions } from './upload';
export { useImagekitDirectUpload } from './useImagekitDirectUpload';

// Attachment classification helpers (URL → kind/name/ext).
export {
  ATTACHMENT_ACCEPT_ALL,
  describeAttachment,
  isVideoUpload,
  typeLabel,
} from './attachment';
export type { AttachmentInfo, AttachmentKind } from './attachment';

// Ready-made upload fields.
export { default as SingleImageUploadField } from './SingleImageUploadField';
export type {
  AvatarShape,
  SingleImageUploadFieldProps,
  SingleImageVariant,
} from './single-image/types';
export { default as AttachmentUploadField } from './AttachmentUploadField';
export type { AttachmentUploadFieldProps, UploadStrategy } from './AttachmentUploadField';
export { default as AttachmentPreview } from './AttachmentPreview';
export type { AttachmentDocVariant, AttachmentPreviewProps } from './AttachmentPreview';
