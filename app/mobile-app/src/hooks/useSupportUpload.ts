import { useState } from 'react';
import * as DocumentPicker from 'expo-document-picker';

import { useUploadLimits } from '@/hooks/useUploadLimits';
import { uploadToImagekitDirect } from '@/services/imagekit-upload';

// Everything the support attachment control accepts: images, videos and the
// document mime list (pdf / word / excel / powerpoint / text / csv).
const PICK_TYPES = [
  'image/*',
  'video/*',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'text/plain',
  'text/csv',
];

/**
 * Shared support-attachment picker + uploader used by the create-ticket field
 * and the ticket reply composer. Picks an image/video/document, enforces the
 * admin Upload Settings cap for that kind, uploads the file DIRECTLY to
 * ImageKit (bypassing the API's request-body size limit) and returns the
 * hosted URL (or null on cancel / too-large / failure).
 */
export function useSupportUpload(folder: string) {
  const limits = useUploadLimits();
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  const pickAndUpload = async (): Promise<string | null> => {
    setError('');
    const result = await DocumentPicker.getDocumentAsync({
      type: PICK_TYPES,
      copyToCacheDirectory: true,
    });
    const asset = result.canceled ? undefined : result.assets[0];
    if (!asset) return null;

    const mimeType = asset.mimeType ?? 'application/octet-stream';
    const overCap = limits.tooLarge({ name: asset.name, mimeType, size: asset.size });
    if (overCap) {
      setError(overCap);
      return null;
    }

    setUploading(true);
    try {
      const url = await uploadToImagekitDirect(
        { uri: asset.uri, name: asset.name ?? `support-${Date.now()}`, type: mimeType },
        folder,
      );
      return url;
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Upload failed');
      return null;
    } finally {
      setUploading(false);
    }
  };

  return { uploading, error, pickAndUpload };
}
