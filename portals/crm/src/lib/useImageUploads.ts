import { useCallback, useState } from 'react';
import { MB, useImagekitBase64Upload, useUploadCaps } from '@duncit/media-picker';
import { parseApiError } from '@duncit/utils';
import { useTranslation } from '@duncit/shell';

/** One uploaded file, in the shape the CRM's image mutations take. */
export interface UploadedImage {
  url: string;
  name: string;
  mime_type: string;
  size_bytes: number;
  width: number | null;
  height: number | null;
}

interface Options {
  /** ImageKit folder the files go to. */
  folder: string;
  /** MIME types this surface accepts; anything else is refused before upload. */
  accept: readonly string[];
  /** The record the files belong to — the server files them in its folder. */
  entityId?: string;
}

/** Natural pixel size of an image file, or nulls when the browser cannot tell (e.g. some SVGs). */
export function readImageSize(file: File): Promise<{ width: number | null; height: number | null }> {
  return new Promise((resolve) => {
    if (typeof URL.createObjectURL !== 'function') {
      resolve({ width: null, height: null });
      return;
    }
    const src = URL.createObjectURL(file);
    const img = new Image();
    const done = (width: number | null, height: number | null) => {
      URL.revokeObjectURL(src);
      resolve({ width, height });
    };
    img.onload = () => done(img.naturalWidth || null, img.naturalHeight || null);
    img.onerror = () => done(null, null);
    img.src = src;
  });
}

/**
 * Upload image files for a CRM surface: refuse a wrong type or an oversize file
 * (Admin › Upload Settings, Portals cap) with a message naming the file, upload
 * the rest one by one, and report each stored URL with its type, size and
 * dimensions. Files that fail do not stop the others.
 */
export function useImageUploads({ folder, accept, entityId }: Options) {
  const { t } = useTranslation();
  const { upload } = useImagekitBase64Upload();
  const caps = useUploadCaps('PORTALS');
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);

  const uploadFiles = useCallback(
    async (files: FileList | File[] | null): Promise<UploadedImage[]> => {
      const list = files ? Array.from(files) : [];
      if (list.length === 0) return [];
      setBusy(true);
      const problems: string[] = [];
      const done: UploadedImage[] = [];
      for (const file of list) {
        if (!accept.includes(file.type)) {
          problems.push(t('crm.media.wrongType', { vars: { name: file.name } }));
          continue;
        }
        if (file.size > caps.maxImageBytes) {
          problems.push(t('crm.media.tooLarge', { vars: { name: file.name, max: Math.round(caps.maxImageBytes / MB) } }));
          continue;
        }
        try {
          const [{ url }, size] = await Promise.all([
            upload(file, { folder, entityId, fallbackMimeType: file.type }),
            readImageSize(file),
          ]);
          done.push({ url, name: file.name, mime_type: file.type, size_bytes: file.size, ...size });
        } catch (e) {
          problems.push(`${file.name}: ${parseApiError(e)}`);
        }
      }
      setErrors(problems);
      setBusy(false);
      return done;
    },
    [accept, caps.maxImageBytes, entityId, folder, t, upload]
  );

  return { uploadFiles, busy, errors, setErrors };
}
