/**
 * One field, three chromes — the superset of the three portal copies:
 * - 'url-adornment' = portals/website-app ImageField (TextField with upload
 *   adornment, open-in-new, preview card, URL paste allowed).
 * - 'url-button'    = portals/finance AttachmentField (TextField + Upload
 *   button, URL paste allowed, no preview).
 * - 'avatar'        = portals/crm ImageUploadField (avatar/square preview,
 *   Replace/Remove buttons, NO URL paste — everything goes through ImageKit).
 */
export type SingleImageVariant = 'url-adornment' | 'url-button' | 'avatar';

export type AvatarShape = 'circle' | 'square';

export interface SingleImageUploadFieldProps {
  /** Current URL (controlled). For react-hook-form pass field.value/field.onChange. */
  value: string;
  onChange: (url: string) => void;
  /** ImageKit folder, e.g. '/website', 'crm', '/expenses'. */
  folder: string;
  variant?: SingleImageVariant;
  label?: string;
  helperText?: string;
  /** External error flag (url variants forward it to the TextField). */
  error?: boolean;
  disabled?: boolean;
  /** File-input accept list. Default 'image/*'. */
  accept?: string;
  /** Per-file size cap in bytes; null disables the cap. Default 15 MB. */
  maxBytes?: number | null;
  /** Custom over-size message (e.g. crm's 'Max 8MB. Compress and try again.'). */
  oversizeMessage?: (file: File) => string;
  /** Fallback when the browser reports an empty file.type (crm used 'image/png'). */
  fallbackMimeType?: string;
  /** Avatar variant only: circular (profile photo) vs rounded square preview. */
  shape?: AvatarShape;
  /** data-testid put on the upload button (crm used `upload-${name}`). */
  uploadTestId?: string;
  /** Idle label of the upload button ('url-button' variant). Default 'Upload'. */
  buttonLabel?: string;
}

export interface SingleImageState {
  busy: boolean;
  error: string | null;
  setError: (msg: string | null) => void;
  openPicker: () => void;
}
