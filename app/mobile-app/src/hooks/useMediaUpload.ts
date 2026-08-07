import { useState } from 'react';
import * as ImagePicker from 'expo-image-picker';

import type { CropResult, PickedMedia, UploadStage } from '@/components/media-crop/MediaCropDialog';
import { UploadImageDocument } from '@/graphql/status';
import { graphqlRequest } from '@/services/graphql.client';
import { uploadToImagekitDirect } from '@/services/imagekit-upload';
import { compressUploadedVideo } from '@/services/video-compression';

/** Turn a picked expo-image-picker asset into the dialog's PickedMedia shape. */
function toPickedMedia(asset: ImagePicker.ImagePickerAsset): PickedMedia {
  const kind = asset.type === 'video' ? 'video' : 'image';
  return {
    uri: asset.uri,
    base64: asset.base64,
    fileName: asset.fileName ?? `pod-${Date.now()}.${kind === 'video' ? 'mp4' : 'jpg'}`,
    mimeType: asset.mimeType ?? (kind === 'video' ? 'video/mp4' : 'image/jpeg'),
    fileSize: asset.fileSize ?? null,
    width: asset.width ?? 0,
    height: asset.height ?? 0,
    kind,
    durationMs: asset.duration ?? null,
  };
}

/**
 * Two-step pod-media upload: `pick(limit)` opens the library and QUEUES what was
 * chosen; the head of the queue is `pending`, which drives the crop/preview
 * dialog, and `confirm(crop)` uploads it and advances to the next — images go
 * through the server crop+compress+AI path with the chosen crop rect, videos
 * stream direct with a real byte % then the FFmpeg pass. Each hosted URL is
 * delivered via `onUploaded` as it lands.
 *
 * The queue is what lets a cover picker take several at once: the OS gallery
 * already does multi-select, and cropping them one after another beats cropping
 * five blind or forcing five round trips through the picker.
 */
export function useMediaUpload(folder: string, onUploaded: (url: string) => void) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | undefined>();
  // Head of the queue is what the crop dialog is showing.
  const [queue, setQueue] = useState<PickedMedia[]>([]);
  const pending = queue[0] ?? null;
  const [stage, setStage] = useState<UploadStage>('processing');
  const [progress, setProgress] = useState<number | null>(null);

  const pick = async (limit = 1) => {
    setError(undefined);
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setError('Photo access is needed to upload media.');
      return;
    }
    const room = Math.max(1, Math.floor(limit) || 1);
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images', 'videos'],
      base64: true,
      quality: 0.8,
      allowsMultipleSelection: room > 1,
      // The OS enforces this too, but a gallery that let the user tick seven and
      // then silently dropped two would be worse than one that stops at five.
      selectionLimit: room,
    });
    if (result.canceled) return;
    const assets = (result.assets ?? []).slice(0, room);
    if (assets.length === 0) return;
    setProgress(null);
    setQueue(assets.map(toPickedMedia));
  };

  /** Skip the one on screen and move to the next — for a single pick, that is
   * the same "don't upload it" the button always meant. */
  const cancel = () => {
    setQueue((current) => current.slice(1));
    setProgress(null);
  };

  const uploadVideo = async (media: PickedMedia): Promise<string> => {
    setStage('uploading');
    setProgress(0);
    const rawUrl = await uploadToImagekitDirect(
      { uri: media.uri, name: media.fileName, type: media.mimeType },
      folder,
      setProgress,
    );
    setStage('compressing');
    setProgress(0);
    return compressUploadedVideo(rawUrl, folder, setProgress);
  };

  const uploadImage = async (media: PickedMedia, crop: CropResult): Promise<string> => {
    setStage('processing');
    setProgress(null);
    const res = await graphqlRequest(
      UploadImageDocument,
      {
        fileBase64: `data:${media.mimeType};base64,${media.base64}`,
        fileName: media.fileName,
        mimeType: media.mimeType,
        folder,
        surface: 'MOBILE',
        crop: crop.cropRect ?? undefined,
        cropPreset: crop.cropRect ? crop.cropPresetKey : undefined,
      },
      { auth: true },
    );
    return res.uploadImageToImagekit.url;
  };

  const confirm = async (crop: CropResult) => {
    if (!pending) return;
    setUploading(true);
    setError(undefined);
    try {
      const url =
        pending.kind === 'video' ? await uploadVideo(pending) : await uploadImage(pending, crop);
      onUploaded(url);
      setQueue((current) => current.slice(1));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
      setProgress(null);
    }
  };

  // `remaining` is what the crop dialog counts down while a batch runs.
  return {
    uploading,
    error,
    pending,
    remaining: queue.length,
    stage,
    progress,
    pick,
    confirm,
    cancel,
  };
}
