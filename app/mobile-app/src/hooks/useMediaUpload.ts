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
 * Two-step pod-media upload: `pick()` opens the library and stages the picked
 * asset (`pending`) for the crop/preview dialog; `confirm(crop)` uploads it —
 * images go through the server crop+compress+AI path with the chosen crop rect,
 * videos stream direct with a real byte % then the FFmpeg pass. The hosted URL
 * is delivered via `onUploaded`.
 */
export function useMediaUpload(folder: string, onUploaded: (url: string) => void) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const [pending, setPending] = useState<PickedMedia | null>(null);
  const [stage, setStage] = useState<UploadStage>('processing');
  const [progress, setProgress] = useState<number | null>(null);

  const pick = async () => {
    setError(undefined);
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setError('Photo access is needed to upload media.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images', 'videos'],
      base64: true,
      quality: 0.8,
    });
    const asset = result.canceled ? undefined : result.assets[0];
    if (!asset) return;
    setProgress(null);
    setPending(toPickedMedia(asset));
  };

  const cancel = () => {
    setPending(null);
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
      setPending(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
      setProgress(null);
    }
  };

  return { uploading, error, pending, stage, progress, pick, confirm, cancel };
}
