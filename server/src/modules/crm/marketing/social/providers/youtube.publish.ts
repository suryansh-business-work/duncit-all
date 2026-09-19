import { videoSourceUrl } from '@utils/url';
import type { SocialPublisher } from '../social.types';
import { SocialApiError, bearer, socialFetch } from './http';
import { YOUTUBE_SERVICE } from './youtube';

/**
 * A YouTube upload, through the resumable upload protocol: one call with the
 * video's details hands back an upload address, and the file is streamed to
 * it straight from ImageKit — a 100 MB video never sits in the server's memory.
 */
const UPLOAD_URL = 'https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status';
/** "People & Blogs" — YouTube requires a category and this is the neutral one. */
const CATEGORY_ID = '22';
const TITLE_LIMIT = 100;

/** YouTube refuses angle brackets in a title or description. */
const clean = (text: string) => text.replaceAll(/[<>]/g, '');

/** The first line of the post, which is what a person would call the video. */
export function videoTitle(text: string): string {
  const firstLine = text.split('\n').find((line) => line.trim()) ?? '';
  return clean(firstLine).trim().slice(0, TITLE_LIMIT);
}

export const youtubePublisher: SocialPublisher = {
  async publish(account, content) {
    const source = await fetch(videoSourceUrl(content.media_url));
    if (!source.ok || !source.body) {
      throw new SocialApiError(YOUTUBE_SERVICE, source.status, `could not read the video (HTTP ${source.status})`, false);
    }
    const type = source.headers.get('content-type') ?? 'video/mp4';
    const length = source.headers.get('content-length');
    const sizeHeaders: Record<string, string> = length ? { 'X-Upload-Content-Length': length } : {};

    const { headers } = await socialFetch(YOUTUBE_SERVICE, UPLOAD_URL, {
      method: 'POST',
      headers: {
        ...bearer(account.access_token),
        ...sizeHeaders,
        'content-type': 'application/json; charset=UTF-8',
        'X-Upload-Content-Type': type,
      },
      body: JSON.stringify({
        snippet: { title: videoTitle(content.text), description: clean(content.text), categoryId: CATEGORY_ID },
        status: { privacyStatus: 'public', selfDeclaredMadeForKids: false },
      }),
    });
    const uploadUrl = headers.get('location');
    if (!uploadUrl) throw new SocialApiError(YOUTUBE_SERVICE, 502, 'YouTube did not return an upload address', false);

    const lengthHeader: Record<string, string> = length ? { 'content-length': length } : {};
    const upload = await fetch(uploadUrl, {
      method: 'PUT',
      headers: { ...bearer(account.access_token), ...lengthHeader, 'content-type': type },
      body: source.body,
      duplex: 'half',
    });
    const video = (await upload.json().catch(() => ({}))) as { id?: string; error?: { message?: string } };
    if (!upload.ok || !video.id) {
      const reason = video.error?.message ?? `HTTP ${upload.status}`;
      throw new SocialApiError(YOUTUBE_SERVICE, upload.status, `the upload failed (${reason})`, upload.status === 401);
    }
    return { external_id: video.id, permalink: `https://www.youtube.com/watch?v=${video.id}` };
  },
};
