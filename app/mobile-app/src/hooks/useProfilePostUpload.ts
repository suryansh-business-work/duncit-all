import { useState } from 'react';
import * as ImagePicker from 'expo-image-picker';

import { useStatusStore } from '@/stores/status.store';

/** Drives the Profile "+ Add Post" flow: pick an image and publish it as a
 * permanent Profile POST (kind POST — NOT a 24h Story). Mirrors mWeb's
 * profile UploadDialog, which is image-only; the Stories module is untouched. */
export function useProfilePostUpload() {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const publish = useStatusStore((s) => s.publish);
  const progress = useStatusStore((s) => s.progress);

  const pickAndPost = async () => {
    setError(undefined);
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setError('Photo access is needed to add a post.');
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
      await publish({
        base64: asset.base64,
        uri: asset.uri,
        fileName: asset.fileName,
        mimeType: asset.mimeType,
        mediaType: 'IMAGE',
        kind: 'POST',
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not add your post.');
    } finally {
      setUploading(false);
    }
  };

  return { uploading, error, progress, pickAndPost };
}
