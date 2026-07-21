import { useState } from 'react';
import * as ImagePicker from 'expo-image-picker';

import type { PendingStoryVideo } from '@/components/status/StatusVideoPreviewSheet';
import { useStatusStore, type StatusUploadAsset } from '@/stores/status.store';
import type { VideoTrim } from '@/services/video-compression';
import { scheduleLocalNotification } from '@/services/notifications.service';

// Story videos are capped at 50 MB (Bug 3).
const MAX_STORY_VIDEO_BYTES = 50 * 1024 * 1024;

interface PendingVideoAsset extends PendingStoryVideo {
  fileName?: string | null;
  mimeType?: string | null;
}

/** Drives the "post a story" flow: pick an image or video from the library,
 * upload it and publish the story. Picked videos pause on the preview sheet —
 * clips over the 15s cap must be trimmed there before posting. Mirrors mWeb's
 * StatusUploadProvider. */
export function useStatusUpload() {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | undefined>();
  // A picked video waiting on the preview / 15s-trim sheet (Bug 3).
  const [pendingVideo, setPendingVideo] = useState<PendingVideoAsset | null>(null);
  const publish = useStatusStore((s) => s.publish);
  // Coarse upload progress, surfaced in-app on the "Your story" tile (Bug 1).
  const progress = useStatusStore((s) => s.progress);

  const publishAsset = async (asset: StatusUploadAsset) => {
    setUploading(true);
    // Surface the upload in the notification tray (Bug 1) — best-effort so a
    // denied notification permission never blocks posting.
    scheduleLocalNotification('Posting your story…', 'Uploading your story to Duncit.').catch(
      () => undefined,
    );
    try {
      await publish(asset);
      scheduleLocalNotification(
        'Story posted 🎉',
        'Your story is live for the next 24 hours.',
      ).catch(() => undefined);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not post story.');
    } finally {
      setUploading(false);
    }
  };

  const pickAndUpload = async () => {
    setError(undefined);
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setError('Photo access is needed to post a story.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images', 'videos'],
      base64: true,
      quality: 0.8,
    });
    const asset = result.canceled ? undefined : result.assets[0];
    if (!asset) return;

    if (asset.type === 'video') {
      if ((asset.fileSize ?? 0) > MAX_STORY_VIDEO_BYTES) {
        setError('Video is too large (max 50 MB).');
        return;
      }
      // Videos pause on the preview sheet; over-length clips trim there (Bug 3).
      setPendingVideo({
        uri: asset.uri,
        durationSeconds: (asset.duration ?? 0) / 1000,
        fileName: asset.fileName,
        mimeType: asset.mimeType,
      });
      return;
    }

    await publishAsset({
      base64: asset.base64,
      uri: asset.uri,
      fileName: asset.fileName,
      mimeType: asset.mimeType,
      mediaType: 'IMAGE',
    });
  };

  /** Post the previewed video; `trim` carries the picked 15s window (or null). */
  const confirmVideo = async (trim: VideoTrim | null) => {
    const video = pendingVideo;
    setPendingVideo(null);
    /* istanbul ignore next -- the preview sheet only confirms while a video is pending */
    if (!video) return;
    await publishAsset({
      uri: video.uri,
      fileName: video.fileName,
      mimeType: video.mimeType,
      mediaType: 'VIDEO',
      trim,
    });
  };

  const cancelVideo = () => setPendingVideo(null);

  return { uploading, error, progress, pendingVideo, pickAndUpload, confirmVideo, cancelVideo };
}
