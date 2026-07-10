import { useState } from 'react';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';

import { UploadImageDocument } from '@/graphql/status';
import { graphqlRequest } from '@/services/graphql.client';

// Videos cap at 50 MB; images and documents keep the 100 MB ceiling (support spec).
const VIDEO_MAX_BYTES = 50 * 1024 * 1024;
const FILE_MAX_BYTES = 100 * 1024 * 1024;
// The document picker often reports a generic mime — detect video by extension
// too so the 50 MB cap can't be bypassed by an empty/unknown mimeType.
const VIDEO_EXT_RE = /\.(mp4|mov|m4v|avi|webm|mkv|3gp|ts|flv|wmv|mpe?g)$/i;

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
 * 50 MB video cap, uploads to ImageKit with `allow_documents` and returns the
 * hosted URL (or null on cancel / too-large / failure).
 */
export function useSupportUpload(folder: string) {
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
    const isVideo = mimeType.startsWith('video/') || VIDEO_EXT_RE.test(asset.name ?? '');
    const max = isVideo ? VIDEO_MAX_BYTES : FILE_MAX_BYTES;
    if (typeof asset.size === 'number' && asset.size > max) {
      setError(isVideo ? 'Video is too large (max 50 MB).' : 'File is too large (max 100 MB).');
      return null;
    }

    setUploading(true);
    try {
      const base64 = await FileSystem.readAsStringAsync(asset.uri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      const res = await graphqlRequest(
        UploadImageDocument,
        {
          fileBase64: `data:${mimeType};base64,${base64}`,
          fileName: asset.name ?? `support-${Date.now()}`,
          mimeType,
          folder,
          allowDocuments: true,
        },
        { auth: true },
      );
      return res.uploadImageToImagekit.url;
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Upload failed');
      return null;
    } finally {
      setUploading(false);
    }
  };

  return { uploading, error, pickAndUpload };
}
