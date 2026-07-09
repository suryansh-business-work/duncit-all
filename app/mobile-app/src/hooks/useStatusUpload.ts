import { useState } from 'react';
import * as ImagePicker from 'expo-image-picker';

import { useStatusStore } from '@/stores/status.store';
import { scheduleLocalNotification } from '@/services/notifications.service';

// Story videos are short clips — capped at 15s (Bug 3).
const MAX_STORY_VIDEO_SECONDS = 15;

/** Drives the "post a story" flow: pick an image or video from the library,
 * upload it and publish the story. Mirrors mWeb's StatusUploadProvider. */
export function useStatusUpload() {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const publish = useStatusStore((s) => s.publish);
  // Coarse upload progress, surfaced in-app on the "Your story" tile (Bug 1).
  const progress = useStatusStore((s) => s.progress);

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

    const isVideo = asset.type === 'video';
    const durationMs = asset.duration ?? 0;
    if (isVideo && durationMs > MAX_STORY_VIDEO_SECONDS * 1000) {
      setError(
        `Video is ${Math.round(durationMs / 1000)}s — story videos must be ${MAX_STORY_VIDEO_SECONDS}s or less.`,
      );
      return;
    }

    setUploading(true);
    // Surface the upload in the notification tray (Bug 1) — best-effort so a
    // denied notification permission never blocks posting.
    scheduleLocalNotification('Posting your story…', 'Uploading your story to Duncit.').catch(
      () => undefined,
    );
    try {
      await publish({
        base64: asset.base64,
        fileName: asset.fileName,
        mimeType: asset.mimeType,
        mediaType: isVideo ? 'VIDEO' : 'IMAGE',
      });
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

  return { uploading, error, progress, pickAndUpload };
}
