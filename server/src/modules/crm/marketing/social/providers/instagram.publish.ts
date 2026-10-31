import { jpegSourceUrl, videoSourceUrl } from '@utils/url';
import type { PublishContent, PublishMedia, SocialPublisher } from '../social.types';
import { SocialApiError } from './http';
import { graphBase } from './instagram';
import { INSTAGRAM_SERVICE, carouselContainer, graphGet, graphPost } from './meta';

/**
 * Instagram's content publishing API: make a media container from a URL,
 * wait for Instagram to finish fetching (and, for a Reel, transcoding) it,
 * then publish the container. Two or more pieces of media make a carousel:
 * one container per piece, then a CAROUSEL container naming them all. An
 * Instagram post always carries media. Every call goes to the host the
 * account's token belongs to (see graphBase).
 */
const POLL_MS = 5_000;
/** Five minutes — a Reel of a few hundred MB can take most of that. */
const MAX_POLLS = 60;

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** One account's Graph: its host, token, API version and Instagram user id. */
interface Graph {
  version: string;
  token: string;
  base: string;
  ig: string;
}

async function waitUntilReady(graph: Graph, containerId: string): Promise<void> {
  for (let poll = 0; poll < MAX_POLLS; poll += 1) {
    const state = await graphGet<{ status_code?: string; status?: string }>(
      graph.version,
      `/${containerId}`,
      graph.token,
      { fields: 'status_code,status' },
      graph.base
    );
    if (state.status_code === 'FINISHED') return;
    if (state.status_code === 'ERROR' || state.status_code === 'EXPIRED') {
      throw new SocialApiError(INSTAGRAM_SERVICE, 422, `Instagram could not process the media (${state.status ?? state.status_code})`, false);
    }
    await wait(POLL_MS);
  }
  throw new SocialApiError(INSTAGRAM_SERVICE, 504, 'Instagram was still processing the media after five minutes', false);
}

/** Make one container and wait for Instagram to have it ready; its id. */
async function container(graph: Graph, fields: Record<string, string>): Promise<string> {
  const made = await graphPost<{ id: string }>(graph.version, `/${graph.ig}/media`, graph.token, fields, graph.base);
  await waitUntilReady(graph, made.id);
  return made.id;
}

/** A post of one piece: a Reel for a video, else the JPEG rendition of the picture. */
function singleFields(content: PublishContent): Record<string, string> {
  return content.media_type === 'VIDEO'
    ? { media_type: 'REELS', video_url: videoSourceUrl(content.media_url) }
    : { image_url: jpegSourceUrl(content.media_url) };
}

/** One piece inside a carousel: a video is a VIDEO there, not a Reel. */
function itemFields(item: PublishMedia): Record<string, string> {
  return item.type === 'VIDEO'
    ? { media_type: 'VIDEO', video_url: videoSourceUrl(item.url) }
    : { image_url: jpegSourceUrl(item.url) };
}

export const instagramPublisher: SocialPublisher = {
  async publish(account, content, creds) {
    const graph: Graph = { version: creds.version, token: account.access_token, base: graphBase(account), ig: account.external_id };
    const make = (fields: Record<string, string>) => container(graph, fields);
    const creation =
      content.media.length > 1
        ? await carouselContainer(content.media.map(itemFields), { caption: content.text }, make)
        : await make({ ...singleFields(content), caption: content.text });
    const published = await graphPost<{ id: string }>(graph.version, `/${graph.ig}/media_publish`, graph.token, { creation_id: creation }, graph.base);
    const post = await graphGet<{ permalink?: string }>(graph.version, `/${published.id}`, graph.token, { fields: 'permalink' }, graph.base);
    return { external_id: published.id, permalink: post.permalink ?? '' };
  },
};
