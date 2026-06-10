import { useState } from 'react';
import * as ImagePicker from 'expo-image-picker';

import { useStatusStore } from '@/stores/status.store';

/** Drives the "post a status" flow: pick an image from the library, upload it
 * and publish the post. Mirrors mWeb's StatusUploadProvider (profile kind). */
export function useStatusUpload() {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const publish = useStatusStore((s) => s.publish);

  const pickAndUpload = async () => {
    setError(undefined);
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setError('Photo access is needed to post a status.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      base64: true,
      quality: 0.8,
    });
    const asset = result.canceled ? undefined : result.assets[0];
    if (!asset) return;

    setUploading(true);
    try {
      await publish({ base64: asset.base64, fileName: asset.fileName, mimeType: asset.mimeType });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not post status.');
    } finally {
      setUploading(false);
    }
  };

  return { uploading, error, pickAndUpload };
}
