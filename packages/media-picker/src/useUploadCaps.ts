import { useMemo } from 'react';
import { useUploadSettings } from './useUploadSettings';
import {
  DEFAULT_DOCUMENT_MAX_MB,
  DEFAULT_IMAGE_MAX_MB,
  DEFAULT_VIDEO_MAX_MB,
  MB,
  validateFile,
  type FileCaps,
} from './utils';
import type { FilePolicy, UploadSurface } from './types';

/** Everything a picker needs to gate a file, resolved from Upload Settings. */
export interface UploadCaps extends FileCaps {
  maxImageBytes: number;
  maxVideoBytes: number;
  maxDocumentBytes: number;
  /** Gate one picked file — the same rule the server applies to it. */
  validate: (file: File, policy: Readonly<FilePolicy>) => string | null;
}

/**
 * The admin's upload rules for a surface, as the numbers a picker works in.
 *
 * `useUploadSettings` hands back the row; this turns it into byte caps and one
 * `validate`, because that is what every call site was writing for itself — a
 * `const MAX_BYTES = 100 * 1024 * 1024` at the top of the support form, another
 * in the chat composer, another in the reel field, none of them the number the
 * admin panel showed and none of them the number the server would enforce. A
 * file that passed the dialog and failed the upload is the worst of both.
 *
 * Settings are an enhancement, never a gate: until the query answers (and if it
 * never does) the package defaults apply, exactly as the server falls back when
 * it cannot read the row.
 */
export function useUploadCaps(
  surface: UploadSurface = 'PORTALS',
  options?: { skip?: boolean }
): UploadCaps {
  const settings = useUploadSettings(surface, options);
  return useMemo(() => {
    const caps: FileCaps = {
      maxImageMb: settings?.max_image_mb,
      maxVideoMb: settings?.max_video_mb,
      allowedImageFormats: settings?.allowed_image_formats,
      allowedVideoFormats: settings?.allowed_video_formats,
    };
    return {
      ...caps,
      maxImageBytes: (settings?.max_image_mb ?? DEFAULT_IMAGE_MAX_MB) * MB,
      maxVideoBytes: (settings?.max_video_mb ?? DEFAULT_VIDEO_MAX_MB) * MB,
      maxDocumentBytes: DEFAULT_DOCUMENT_MAX_MB * MB,
      validate: (file, policy) => validateFile(file, policy, caps),
    };
  }, [settings]);
}
