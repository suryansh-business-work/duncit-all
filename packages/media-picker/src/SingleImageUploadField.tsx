import { useSingleImageUpload } from './single-image/useSingleImageUpload';
import UrlAdornmentVariant from './single-image/UrlAdornmentVariant';
import UrlButtonVariant from './single-image/UrlButtonVariant';
import AvatarVariant from './single-image/AvatarVariant';
import type { SingleImageUploadFieldProps } from './single-image/types';

const DEFAULT_MAX_BYTES = 15 * 1024 * 1024;

/**
 * Single-image ImageKit upload field: pick a device file → upload via the
 * server `uploadImageToImagekit` mutation → store the returned URL string.
 * Replaces the three portal copies (website-app ImageField, finance
 * AttachmentField, crm ImageUploadField) — pick the matching `variant`.
 * Controlled via value/onChange; bind react-hook-form with
 * `value={field.value} onChange={field.onChange}`.
 */
export default function SingleImageUploadField({
  value,
  onChange,
  folder,
  variant = 'url-adornment',
  label,
  helperText,
  error: externalError,
  disabled = false,
  accept = 'image/*',
  maxBytes = DEFAULT_MAX_BYTES,
  oversizeMessage,
  fallbackMimeType,
  shape = 'square',
  uploadTestId,
  buttonLabel = 'Upload',
}: Readonly<SingleImageUploadFieldProps>) {
  const state = useSingleImageUpload({
    folder,
    maxBytes,
    oversizeMessage,
    fallbackMimeType,
    onChange,
  });

  const fileInput = (
    <input
      ref={state.inputRef}
      type="file"
      accept={accept}
      hidden
      onChange={(e) => state.onFile(e.target.files?.[0] ?? null)}
    />
  );

  const shared = {
    label,
    value,
    onChange,
    helperText,
    disabled,
    busy: state.busy,
    error: state.error,
    setError: state.setError,
    openPicker: state.openPicker,
    fileInput,
  };

  if (variant === 'avatar') {
    return <AvatarVariant {...shared} shape={shape} uploadTestId={uploadTestId} />;
  }
  if (variant === 'url-button') {
    return (
      <UrlButtonVariant
        {...shared}
        externalError={externalError}
        buttonLabel={buttonLabel}
        uploadTestId={uploadTestId}
      />
    );
  }
  return <UrlAdornmentVariant {...shared} externalError={externalError} />;
}
