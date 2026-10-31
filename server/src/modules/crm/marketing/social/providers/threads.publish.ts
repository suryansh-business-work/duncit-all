import { jpegSourceUrl, videoSourceUrl } from '@utils/url';
import type { PublishContent, PublishMedia, SocialPublisher } from '../social.types';
import { SocialApiError } from './http';
import { carouselContainer } from './meta';
import { THREADS_SERVICE, threadsGet, threadsPost } from './threads';

/**
 * Threads' publishing API, shaped like Instagram's: make a media container,
 * wait for Threads to fetch (and, for a video, transcode) it, then publish the
 * container. Two or more pieces of media make a carousel: one container per
 * piece, then a CAROUSEL container naming them all. Unlike Instagram, a
 * Threads post may be text alone. The text limit is checked before a post
 * reaches here.
 */
const POLL_MS = 5_000;
/** Five minutes — a video of a few hundred MB can take most of that. */
const MAX_POLLS = 60;

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** One account's Threads API: its token, API version and Threads user id. */
interface Threads {
  version: string;
  token: string;
  user: string;
}

/** One piece's kind and source, as Threads names them: a JPEG, or a video. */
function itemFields(item: PublishMedia): Record<string, string> {
  return item.type === 'VIDEO'
    ? { media_type: 'VIDEO', video_url: videoSourceUrl(item.url) }
    : { media_type: 'IMAGE', image_url: jpegSourceUrl(item.url) };
}

/** A post of one piece at most: text alone, or that piece. */
function mediaFields({ media_type, media_url }: PublishContent): Record<string, string> {
  if (!media_url || !media_type) return { media_type: 'TEXT' };
  return itemFields({ url: media_url, type: media_type });
}

async function waitUntilReady(threads: Threads, containerId: string): Promise<void> {
  for (let poll = 0; poll < MAX_POLLS; poll += 1) {
    const state = await threadsGet<{ status?: string; error_message?: string }>(threads.version, `/${containerId}`, threads.token, {
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

/** Make one container and wait for Threads to have it ready; its id. */
async function container(threads: Threads, fields: Record<string, string>): Promise<string> {
  const made = await threadsPost<{ id: string }>(threads.version, `/${threads.user}/threads`, threads.token, fields);
  await waitUntilReady(threads, made.id);
  return made.id;
}

export const threadsPublisher: SocialPublisher = {
  async publish(account, content, creds) {
    const threads: Threads = { version: creds.version, token: account.access_token, user: account.external_id };
    const make = (fields: Record<string, string>) => container(threads, fields);
    const creation =
      content.media.length > 1
        ? await carouselContainer(content.media.map(itemFields), { text: content.text }, make)
        : await make({ ...mediaFields(content), text: content.text });
    const published = await threadsPost<{ id: string }>(threads.version, `/${threads.user}/threads_publish`, threads.token, {
      creation_id: creation,
    });
    const post = await threadsGet<{ permalink?: string }>(threads.version, `/${published.id}`, threads.token, { fields: 'permalink' });
    return { external_id: published.id, permalink: post.permalink ?? '' };
  },
};
