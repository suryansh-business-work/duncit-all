export { default } from './MediaPickerDialog';
export { default as MediaPickerDialog } from './MediaPickerDialog';
export { pickBestVideoFile, validateFile } from './utils';
export type { FileCaps } from './utils';
export type {
  CropRect,
  FilePolicy,
  MediaPickerDialogProps,
  Orientation,
  UploadCropPreset,
  UploadSettings,
  UploadSurface,
} from './types';

// ImageKit upload plumbing (shared by all portals — do not hand-roll the gql doc).
export { UPLOAD_IMAGE, GET_IMAGEKIT_AUTH, UPLOAD_SETTINGS } from './queries';
export { uploadImageToImagekit, useImagekitBase64Upload } from './upload';
export type { ImagekitUploadResult, UploadImageOptions } from './upload';
export { directUploadToImagekit, useImagekitDirectUpload } from './useImagekitDirectUpload';
export type { UploadProgress } from './useImagekitDirectUpload';
export { compressUploadedVideo, type VideoTrim } from './videoCompression';
export { useUploadSettings } from './useUploadSettings';
export { croppablePresets, formatBytes, formatDuration, presetAspect, suggestPresetKey } from './cropUtils';
export { default as ImageCropStep } from './ImageCropStep';
export { default as FileDetails, useMediaDimensions } from './FileDetails';
export type { MediaDimensions } from './FileDetails';

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
