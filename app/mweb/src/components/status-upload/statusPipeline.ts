import { compressUploadedVideo, directUploadToImagekit } from '@duncit/media-picker';
import type { CropRect } from '@duncit/media-picker';
import { apolloClient } from '../../apollo';
import { UPLOAD_STATUS_MEDIA } from './queries';

export type MediaType = 'IMAGE' | 'VIDEO';

export const STATUS_FOLDERS = {
  pod: '/pod-status',
  club: '/club-status',
  profile: '/posts',
} as const;

export type StatusUploadKind = keyof typeof STATUS_FOLDERS;

export interface StatusStage {
  progress: number;
  message: string;
}

function toBase64(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : '');
    reader.onerror = () => reject(new Error('Could not read selected media'));
    reader.readAsDataURL(file);
  });
}

export const mediaTypeOf = (file: File): MediaType =>
  file.type.startsWith('video/') ? 'VIDEO' : 'IMAGE';

/**
 * Upload one status media file to ImageKit, honouring the admin Upload
 * Settings: images go through the server (sharp crop/compression, AI scan);
 * videos stream DIRECTLY to ImageKit with real byte progress and then get the
 * server-side FFmpeg compression pass (real % too, no-op when disabled).
 */
export async function uploadStatusMedia(opts: {
  file: File;
  kind: StatusUploadKind;
  crop?: CropRect | null;
  cropPreset?: string | null;
  onStage: (stage: StatusStage) => void;
}): Promise<string> {
  const { file, kind, onStage } = opts;
  const folder = STATUS_FOLDERS[kind];

  if (mediaTypeOf(file) === 'VIDEO') {
    onStage({ progress: 0, message: 'Uploading status video...' });
    // Real byte progress mapped into the 0–70 band…
    const rawUrl = await directUploadToImagekit(apolloClient, file, folder, (pct) =>
      onStage({ progress: Math.round(pct * 0.7), message: 'Uploading status video...' }),
    );
    // …then the FFmpeg pass fills 70–95 with the real compression percentage.
    return compressUploadedVideo(apolloClient, rawUrl, folder, 'MOBILE_MWEB', (pct) =>
      onStage({ progress: 70 + Math.round(pct * 0.25), message: 'Compressing video...' }),
    );
  }

  onStage({ progress: 8, message: 'Preparing status upload...' });
  const fileBase64 = await toBase64(file);
  onStage({ progress: 45, message: 'Uploading status media...' });
  const uploaded = await apolloClient.mutate({
    mutation: UPLOAD_STATUS_MEDIA,
    variables: {
      fileBase64,
      fileName: file.name,
      mimeType: file.type,
      folder,
      crop: opts.crop ?? undefined,
      cropPreset: opts.cropPreset ?? undefined,
    },
  });
  const url = uploaded.data?.uploadImageToImagekit?.url;
  if (!url) throw new Error('Upload failed');
  return url;
}
