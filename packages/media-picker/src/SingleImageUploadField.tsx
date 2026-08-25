import { Stack } from '@mui/material';
import { AiMonitoringChip } from '@duncit/ai-monitoring/mui';
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

  // Chosen into a variable rather than returned from three branches: all three
  // chromes carry the same AI Monitoring notice, and three placements would be
  // three chances for one of them to lose it.
  let chrome = <UrlAdornmentVariant {...shared} externalError={externalError} />;
  if (variant === 'avatar') {
    chrome = <AvatarVariant {...shared} shape={shape} uploadTestId={uploadTestId} />;
  } else if (variant === 'url-button') {
    chrome = (
      <UrlButtonVariant
        {...shared}
        externalError={externalError}
        buttonLabel={buttonLabel}
        uploadTestId={uploadTestId}
      />
    );
  }

  return (
    <Stack spacing={0.75} sx={{
      alignItems: "flex-start"
    }}>
      {chrome}
      <AiMonitoringChip />
    </Stack>
  );
}
