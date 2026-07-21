import { useEffect, useRef, useState } from 'react';
import type { ChangeEvent } from 'react';
import { useApolloClient } from '@apollo/client';
import { uploadImageToImagekit } from './upload';
import { directUploadToImagekit } from './useImagekitDirectUpload';
import { useUploadSettings } from './useUploadSettings';
import { compressUploadedVideo } from './videoCompression';
import { croppablePresets } from './cropUtils';
import { validateFile } from './utils';
import type { CropRect, FilePolicy, UploadSurface } from './types';

export type UploadStage = 'uploading' | 'compressing';

interface Args extends FilePolicy {
  open: boolean;
  folder: string;
  surface: UploadSurface;
  onPicked: (url: string) => void;
  onClose: () => void;
  setError: (msg: string | null) => void;
}

export function useDeviceUpload({
  open,
  folder,
  surface,
  allowImage,
  allowVideo,
  allowDocuments,
  onPicked,
  onClose,
  setError,
}: Args) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [picked, setPicked] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploadPct, setUploadPct] = useState<number | null>(null);
  const [uploading, setUploading] = useState(false);
  const [stage, setStage] = useState<UploadStage>('uploading');
  // Crop selection — null until the user picks; falls back to the admin default.
  const [cropKeyOverride, setCropKeyOverride] = useState<string | null>(null);
  const [cropRect, setCropRect] = useState<CropRect | null>(null);

  const client = useApolloClient();
  const settings = useUploadSettings(surface);
  const cropKey = cropKeyOverride ?? settings?.default_crop_key ?? 'NO_CROP';

  useEffect(() => {
    if (!open) return;
    setPicked(null);
    setPreviewUrl(null);
    setUploadPct(null);
    setUploading(false);
    setStage('uploading');
    setCropKeyOverride(null);
    setCropRect(null);
  }, [open]);

  useEffect(() => {
    if (!picked) {
      setPreviewUrl(null);
      return;
    }
    const u = URL.createObjectURL(picked);
    setPreviewUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [picked]);

  const onPickFile = (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const problem = validateFile(
      f,
      { allowImage, allowVideo, allowDocuments },
      {
        maxImageMb: settings?.max_image_mb,
        maxVideoMb: settings?.max_video_mb,
        allowedImageFormats: settings?.allowed_image_formats,
        allowedVideoFormats: settings?.allowed_video_formats,
      },
    );
    if (problem) {
      setError(problem);
      return;
    }
    setError(null);
    setCropRect(null);
    setPicked(f);
  };

  const uploadFromDevice = async () => {
    if (!picked) return;
    const isVideo = picked.type.startsWith('video/');
    setUploading(true);
    setStage('uploading');
    setUploadPct(isVideo ? 0 : 10);
    setError(null);
    try {
      let url: string;
      if (isVideo) {
        // Videos stream DIRECTLY to ImageKit with real byte progress, then a
        // server-side FFmpeg pass compresses them (no-op when disabled).
        url = await directUploadToImagekit(client, picked, folder, setUploadPct);
        setStage('compressing');
        setUploadPct(0);
        url = await compressUploadedVideo(client, url, folder, surface, setUploadPct);
      } else {
        const croppable = croppablePresets(settings?.crop_presets ?? []).some(
          (p) => p.key === cropKey,
        );
        const uploaded = await uploadImageToImagekit(client, picked, {
          folder,
          allowDocuments,
          onProgress: setUploadPct,
          surface,
          crop: croppable ? cropRect : null,
          cropPreset: croppable ? cropKey : null,
        });
        url = uploaded.url;
      }
      setUploadPct(100);
      onPicked(url);
      onClose();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setUploading(false);
      setUploadPct(null);
      setStage('uploading');
    }
  };

  return {
    fileInputRef,
    picked,
    previewUrl,
    uploadPct,
    uploading,
    stage,
    settings,
    cropKey,
    setCropKey: setCropKeyOverride,
    setCropRect,
    onPickFile,
    uploadFromDevice,
  };
}
