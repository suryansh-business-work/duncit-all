import { useState } from 'react';
import * as ImagePicker from 'expo-image-picker';

import { CategoryMediaType } from '@/generated/graphql/graphql';
import { AddPodStatusDocument } from '@/graphql/pod-media';
import { useTranslation } from '@/hooks/useTranslation';
import { useUploadLimits } from '@/hooks/useUploadLimits';
import { graphqlRequest } from '@/services/graphql.client';
import { uploadStatusMedia } from '@/services/status-media-upload';
import { toErrorMessage } from '@/utils/errors';

/** Where pod statuses land in ImageKit — mWeb's STATUS_FOLDERS.pod. */
const POD_STATUS_FOLDER = '/pod-status';

/**
 * The host's "Add status" flow on their own pod: pick a photo or clip, upload
 * it and add it to the pod's gallery, then let the screen re-read the pod.
 * Like mWeb's pod status, a clip goes straight up with no trim step.
 */
export function usePodStatusUpload(podId: string, onAdded: () => Promise<void>) {
  const { t } = useTranslation();
  const limits = useUploadLimits();
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pickAndAdd = async () => {
    setError(null);
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setError(t('mweb.podDetails.addStatusPhotoAccess'));
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images', 'videos'],
      base64: true,
      quality: 0.8,
    });
    const asset = result.canceled ? undefined : result.assets[0];
    if (!asset) return;

    const isVideo = asset.type === 'video';
    const mediaType = isVideo ? CategoryMediaType.Video : CategoryMediaType.Image;
    const fallbackMime = isVideo ? 'video/mp4' : 'image/jpeg';
    const overCap = limits.tooLarge({
      name: asset.fileName,
      mimeType: asset.mimeType ?? fallbackMime,
      size: asset.fileSize,
    });
    if (overCap) {
      setError(overCap);
      return;
    }

    setUploading(true);
    try {
      const url = await uploadStatusMedia(
        {
          base64: asset.base64,
          uri: asset.uri,
          fileName: asset.fileName,
          mimeType: asset.mimeType,
          mediaType,
        },
        POD_STATUS_FOLDER,
      );
      await graphqlRequest(
        AddPodStatusDocument,
        { podId, media: { url, type: mediaType } },
        { auth: true },
      );
      await onAdded();
    } catch (err) {
      setError(toErrorMessage(err, t('mweb.podDetails.addStatusFailed')));
    } finally {
      setUploading(false);
    }
  };

  return { uploading, error, pickAndAdd };
}
