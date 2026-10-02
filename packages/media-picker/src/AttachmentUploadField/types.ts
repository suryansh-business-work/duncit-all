import type { SxProps, Theme } from '@mui/material';
import type { UploadSurface } from '../types';
import type { AttachmentDocVariant } from '../AttachmentPreview';

export type UploadStrategy = 'base64' | 'direct';

export interface AttachmentUploadFieldProps {
  value: string[];
  onChange: (next: string[]) => void;
  /** ImageKit folder. Default '/support'. */
  folder?: string;
  /** Maximum number of attachments. Default 5. */
  max?: number;
  label?: string;
  disabled?: boolean;
  /** File-input accept list. Default 'image/*' (use ATTACHMENT_ACCEPT_ALL for docs). */
  accept?: string;
  /**
   * Per-file cap for images and documents, in bytes. Omit it — Admin > Upload
   * Settings for `surface` is the answer, and a number here overrides the
   * admin. `null` means no client-side cap at all (the server still has one).
   */
  maxBytes?: number | null;
  /** Same for videos: omit it and the admin's video cap applies. */
  videoMaxBytes?: number | null;
  /** Which Upload Settings row supplies the caps. Default PORTALS. */
  surface?: UploadSurface;
  /** Let the server accept PDF/office documents (base64 strategy). */
  allowDocuments?: boolean;
  /** 'base64' = server mutation; 'direct' = signed direct-to-ImageKit (large files). */
  strategy?: UploadStrategy;
  /** Allow selecting several files per pick. Default true. */
  multiple?: boolean;
  /** Thumbnail edge in px (64 support/website, 72 mWeb). */
  previewSize?: number;
  /** Non-image preview: 'chip' (support) or 'card' (mWeb). */
  previewVariant?: AttachmentDocVariant;
  /** Error rendering: caption 'text' (support/website) or dismissible 'chip' (mWeb). */
  errorVariant?: 'text' | 'chip';
  oversizeMessage?: (file: File) => string;
  videoOversizeMessage?: string;
  buttonLabel?: string;
  buttonSx?: SxProps<Theme>;
}
