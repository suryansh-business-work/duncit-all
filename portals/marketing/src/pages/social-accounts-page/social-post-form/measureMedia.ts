import type { SocialPostMedia } from '../publish.queries';

export interface MediaSize {
  width: number;
  height: number;
  /** Null for a picture, or a video whose length the browser could not read. */
  duration_s: number | null;
}

/**
 * What a picture or clip measures, read by the browser from its address — the
 * size for Instagram's 4:5–1.91:1 feed rule, the length for the reel and story
 * limits. Only the metadata of a video is fetched. Null when it cannot be read
 * (a cross-origin refusal, a broken file): the post is then judged without it,
 * as the server does.
 */
export function measureMedia(item: Pick<SocialPostMedia, 'url' | 'type'>): Promise<MediaSize | null> {
  return new Promise((resolve) => {
    if (item.type === 'IMAGE') {
      const image = new Image();
      image.onload = () => resolve(image.naturalWidth && image.naturalHeight ? { width: image.naturalWidth, height: image.naturalHeight, duration_s: null } : null);
      image.onerror = () => resolve(null);
      image.src = item.url;
      return;
    }
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.onloadedmetadata = () =>
      resolve({ width: video.videoWidth, height: video.videoHeight, duration_s: Number.isFinite(video.duration) ? video.duration : null });
    video.onerror = () => resolve(null);
    video.src = item.url;
  });
}
