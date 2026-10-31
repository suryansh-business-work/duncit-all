import { jpegSourceUrl, videoSourceUrl } from '@utils/url';
import type { PublishContent, SocialPublisher } from '../social.types';
import { SocialApiError } from './http';
import { THREADS_SERVICE, threadsGet, threadsPost } from './threads';

/**
 * Threads' publishing API, shaped like Instagram's: make a media container,
 * wait for Threads to fetch (and, for a video, transcode) it, then publish the
 * container. Unlike Instagram, a Threads post may be text alone. The text
 * limit is checked before a post reaches here.
 */
const POLL_MS = 5_000;
/** Five minutes — a video of a few hundred MB can take most of that. */
const MAX_POLLS = 60;

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** The container's kind and source, as Threads names them: text alone, a JPEG, or a video. */
function mediaFields({ media_type, media_url }: PublishContent): Record<string, string> {
  if (!media_url || !media_type) return { media_type: 'TEXT' };
  return media_type === 'VIDEO'
    ? { media_type: 'VIDEO', video_url: videoSourceUrl(media_url) }
    : { media_type: 'IMAGE', image_url: jpegSourceUrl(media_url) };
}

async function waitUntilReady(version: string, containerId: string, token: string): Promise<void> {
  for (let poll = 0; poll < MAX_POLLS; poll += 1) {
    const state = await threadsGet<{ status?: string; error_message?: string }>(version, `/${containerId}`, token, {
      fields: 'status,error_message',
    });
    if (state.status === 'FINISHED') return;
    if (state.status === 'ERROR' || state.status === 'EXPIRED') {
      const reason = state.error_message ?? state.status;
      throw new SocialApiError(THREADS_SERVICE, 422, `Threads could not process the post (${reason})`, false);
    }
    await wait(POLL_MS);
  }
  throw new SocialApiError(THREADS_SERVICE, 504, 'Threads was still processing the post after five minutes', false);
}

export const threadsPublisher: SocialPublisher = {
  async publish(account, content, creds) {
    const user = account.external_id;
    const token = account.access_token;
    const container = await threadsPost<{ id: string }>(creds.version, `/${user}/threads`, token, {
      ...mediaFields(content),
      text: content.text,
    });
    await waitUntilReady(creds.version, container.id, token);
    const published = await threadsPost<{ id: string }>(creds.version, `/${user}/threads_publish`, token, {
      creation_id: container.id,
    });
    const post = await threadsGet<{ permalink?: string }>(creds.version, `/${published.id}`, token, { fields: 'permalink' });
    return { external_id: published.id, permalink: post.permalink ?? '' };
  },
};
