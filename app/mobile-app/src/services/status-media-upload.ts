import { UploadImageDocument } from '@/graphql/status';
import { graphqlRequest } from '@/services/graphql.client';
import { uploadToImagekitDirect } from '@/services/imagekit-upload';
import { compressUploadedVideo, type VideoTrim } from '@/services/video-compression';

/** One picked photo or clip, as the status uploads (story or pod) receive it. */
export interface StatusMediaAsset {
  base64?: string | null;
  /** Picker URI — videos stream from it directly (no base64). */
  uri?: string | null;
  fileName?: string | null;
  mimeType?: string | null;
  mediaType?: 'IMAGE' | 'VIDEO';
  /** Trim window (seconds) the server cuts during the FFmpeg pass — set when a
   * picked video runs past the 15s story cap. */
  trim?: VideoTrim | null;
}

/**
 * Uploads one status photo or clip to ImageKit and answers with its url.
 * `onProgress` reports the upload's share of the whole publish (2–70).
 * Mirrors mWeb's statusPipeline `uploadStatusMedia`.
 */
export async function uploadStatusMedia(
  asset: StatusMediaAsset,
  folder: string,
  onProgress?: (progress: number) => void,
): Promise<string> {
  const isVideo = asset.mediaType === 'VIDEO';
  const mimeType = asset.mimeType ?? (isVideo ? 'video/mp4' : 'image/jpeg');
  const fileName = asset.fileName ?? `story-${Date.now()}.${isVideo ? 'mp4' : 'jpg'}`;
  if (isVideo) {
    if (!asset.uri) throw new Error('No media selected.');
    // Videos stream from their URI with REAL byte progress (2–55), then the
    // server-side FFmpeg pass fills 55–70 — the old base64 path silently
    // sent corrupt bytes (the picker returns no base64 for videos).
    const rawUrl = await uploadToImagekitDirect(
      { uri: asset.uri, name: fileName, type: mimeType },
      folder,
      (pct) => onProgress?.(2 + Math.round(pct * 0.53)),
    );
    return compressUploadedVideo(
      rawUrl,
      folder,
      (pct) => onProgress?.(55 + Math.round(pct * 0.15)),
      asset.trim ?? null,
    );
  }
  if (!asset.base64) throw new Error('No media selected.');
  // Images go through the server so the admin Upload Settings apply
  // (sharp compression + AI image monitoring).
  const uploaded = await graphqlRequest(
    UploadImageDocument,
    {
      fileBase64: `data:${mimeType};base64,${asset.base64}`,
      fileName,
      mimeType,
      folder,
      surface: 'MOBILE',
    },
    { auth: true },
  );
  return uploaded.uploadImageToImagekit.url;
}
