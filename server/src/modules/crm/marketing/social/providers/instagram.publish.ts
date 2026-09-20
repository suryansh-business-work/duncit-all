import { jpegSourceUrl, videoSourceUrl } from '@utils/url';
import type { SocialPublisher } from '../social.types';
import { SocialApiError } from './http';
import { META_SERVICE, graphGet, graphPost } from './meta';

/**
 * Instagram's content publishing API: make a media container from a URL,
 * wait for Instagram to finish fetching (and, for a Reel, transcoding) it,
 * then publish the container. An Instagram post always carries media.
 */
const POLL_MS = 5_000;
/** Five minutes — a Reel of a few hundred MB can take most of that. */
const MAX_POLLS = 60;

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function waitUntilReady(version: string, containerId: string, token: string): Promise<void> {
  for (let poll = 0; poll < MAX_POLLS; poll += 1) {
    const state = await graphGet<{ status_code?: string; status?: string }>(version, `/${containerId}`, token, {
      fields: 'status_code,status',
    });
    if (state.status_code === 'FINISHED') return;
    if (state.status_code === 'ERROR' || state.status_code === 'EXPIRED') {
      throw new SocialApiError(META_SERVICE, 422, `Instagram could not process the media (${state.status ?? state.status_code})`, false);
    }
    await wait(POLL_MS);
  }
  throw new SocialApiError(META_SERVICE, 504, 'Instagram was still processing the media after five minutes', false);
}

export const instagramPublisher: SocialPublisher = {
  async publish(account, content, creds) {
    const ig = account.external_id;
    const token = account.access_token;
    const media: Record<string, string> =
      content.media_type === 'VIDEO'
        ? { media_type: 'REELS', video_url: videoSourceUrl(content.media_url) }
        : { image_url: jpegSourceUrl(content.media_url) };
    const container = await graphPost<{ id: string }>(creds.version, `/${ig}/media`, token, { ...media, caption: content.text });
    await waitUntilReady(creds.version, container.id, token);
    const published = await graphPost<{ id: string }>(creds.version, `/${ig}/media_publish`, token, {
      creation_id: container.id,
    });
    const post = await graphGet<{ permalink?: string }>(creds.version, `/${published.id}`, token, { fields: 'permalink' });
    return { external_id: published.id, permalink: post.permalink ?? '' };
  },
};
