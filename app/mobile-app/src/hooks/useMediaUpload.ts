import { useState } from 'react';
import * as ImagePicker from 'expo-image-picker';

import { UploadImageDocument } from '@/graphql/status';
import { graphqlRequest } from '@/services/graphql.client';

/**
 * Pick an image/video from the library and upload it to ImageKit (the same
 * pipeline the story upload uses) — returns the hosted URL, or null when the
 * user cancels / permission is denied / the upload fails.
 */
export function useMediaUpload(folder: string) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | undefined>();

  const pickAndUpload = async (): Promise<string | null> => {
    setError(undefined);
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setError('Photo access is needed to upload media.');
      return null;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images', 'videos'],
      base64: true,
      quality: 0.8,
    });
    const asset = result.canceled ? undefined : result.assets[0];
    if (!asset) return null;

    setUploading(true);
    try {
      const mimeType = asset.mimeType ?? 'image/jpeg';
      const res = await graphqlRequest(
        UploadImageDocument,
        {
          fileBase64: `data:${mimeType};base64,${asset.base64}`,
          fileName: asset.fileName ?? `pod-${Date.now()}`,
          mimeType,
          folder,
        },
        { auth: true },
      );
      return res.uploadImageToImagekit.url;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
      return null;
    } finally {
      setUploading(false);
    }
  };

  return { uploading, error, pickAndUpload };
}
