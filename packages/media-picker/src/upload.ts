import { useCallback, useState } from 'react';
import { useApolloClient } from '@apollo/client';
import type { ApolloClient } from '@apollo/client';
import { fileToDataUrl } from '@duncit/utils';
import { UPLOAD_IMAGE } from './queries';
import type { CropRect, UploadSurface } from './types';

export interface ImagekitUploadResult {
  url: string;
  fileId?: string | null;
  thumbnailUrl?: string | null;
}

export interface UploadImageOptions {
  /** ImageKit folder, e.g. "/support", "crm/media". */
  folder?: string;
  /** Pass true so the server also accepts PDF/office documents. */
  allowDocuments?: boolean;
  /** Overrides the uploaded file name (defaults to file.name). */
  fileName?: string;
  /** Fallback when the browser reports an empty file.type (e.g. 'image/png'). */
  fallbackMimeType?: string;
  /** Cosmetic progress callback; fired with 55 once the file has been read. */
  onProgress?: (pct: number) => void;
  /** Upload Settings surface driving server-side crop/compression rules. */
  surface?: UploadSurface;
  /** Source-pixel crop rect from the crop UI (images only). */
  crop?: CropRect | null;
  /** Crop preset key (NO_CROP / RATIO_16_9 / POD_FEATURE / …). */
  cropPreset?: string | null;
}

interface UploadImageData {
  uploadImageToImagekit?: ImagekitUploadResult | null;
}

/**
 * The ONE base64 upload path: read the file as a data URL, send it through the
 * server `uploadImageToImagekit` mutation (credentials never leave the API
 * server) and return the stored URL (+ fileId/thumbnailUrl when needed).
 * Throws when the server returns no URL.
 */
export async function uploadImageToImagekit(
  client: ApolloClient<object>,
  file: File,
  options: Readonly<UploadImageOptions> = {},
): Promise<ImagekitUploadResult> {
  const fileBase64 = await fileToDataUrl(file);
  options.onProgress?.(55);
  const res = await client.mutate<UploadImageData>({
    mutation: UPLOAD_IMAGE,
    variables: {
      fileBase64,
      fileName: options.fileName ?? file.name,
      mimeType: file.type || options.fallbackMimeType,
      folder: options.folder,
      allowDocuments: options.allowDocuments,
      surface: options.surface,
      crop: options.crop ?? undefined,
      cropPreset: options.cropPreset ?? undefined,
    },
  });
  const uploaded = res.data?.uploadImageToImagekit;
  if (!uploaded?.url) throw new Error('No URL returned from ImageKit upload');
  return uploaded;
}

/**
 * Hook flavour of {@link uploadImageToImagekit} with a busy flag, for
 * components that render a spinner while the upload runs.
 */
export function useImagekitBase64Upload() {
  const client = useApolloClient();
  const [uploading, setUploading] = useState(false);
  const upload = useCallback(
    async (
      file: File,
      options: Readonly<UploadImageOptions> = {},
    ): Promise<ImagekitUploadResult> => {
      setUploading(true);
      try {
        return await uploadImageToImagekit(client, file, options);
      } finally {
        setUploading(false);
      }
    },
    [client],
  );
  return { upload, uploading };
}
