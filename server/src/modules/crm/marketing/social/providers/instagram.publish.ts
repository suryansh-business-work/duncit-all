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
 *
 * The post type picks the container: a REEL is a REELS container, a STORY a
 * STORIES one (no caption — a story has none), and a FEED post of one video
 * also goes out as a reel (Instagram's only video format now). A first
 * comment is posted under a feed post or reel once it is out; if only that
 * fails, the post still counts as published and the reason is kept.
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

/** A post of one piece: a story of either kind, else a Reel for a video and the JPEG rendition of a picture. */
function singleFields(content: PublishContent): Record<string, string> {
  const video = content.media_type === 'VIDEO';
  if (content.post_type === 'STORY') {
    return video
      ? { media_type: 'STORIES', video_url: videoSourceUrl(content.media_url) }
      : { media_type: 'STORIES', image_url: jpegSourceUrl(content.media_url) };
  }
  return video ? { media_type: 'REELS', video_url: videoSourceUrl(content.media_url) } : { image_url: jpegSourceUrl(content.media_url) };
}

/** What a feed post or reel says: its caption and collaborators. A story carries neither. */
const wordsOf = (content: PublishContent): Record<string, string> =>
  content.post_type === 'STORY' ? {} : { caption: content.text, ...collaboratorFields(content) };

/** Post the first comment under the published media; the reason it failed, or '' when it went (or there was none). */
async function firstComment(graph: Graph, mediaId: string, content: PublishContent): Promise<string> {
  const message = content.first_comment?.trim() ?? '';
  if (!message || content.post_type === 'STORY') return '';
  try {
    await graphPost<{ id: string }>(graph.version, `/${mediaId}/comments`, graph.token, { message }, graph.base);
    return '';
  } catch (error) {
    return (error instanceof Error ? error.message : String(error)).slice(0, 500);
  }
}

/** One piece inside a carousel: a video is a VIDEO there, not a Reel. */
function itemFields(item: PublishMedia): Record<string, string> {
  return item.type === 'VIDEO'
    ? { media_type: 'VIDEO', video_url: videoSourceUrl(item.url) }
    : { image_url: jpegSourceUrl(item.url) };
}

/**
 * The collaborators field of a feed post, reel or carousel container: a JSON
 * list of usernames. Absent when there are none, so a plain post is sent
 * exactly as before.
 */
export function collaboratorFields(content: PublishContent): Record<string, string> {
  const names = content.collaborators ?? [];
  return names.length > 0 ? { collaborators: JSON.stringify(names) } : {};
}

export const instagramPublisher: SocialPublisher = {
  async publish(account, content, creds) {
    const graph: Graph = { version: creds.version, token: account.access_token, base: graphBase(account), ig: account.external_id };
    const make = (fields: Record<string, string>) => container(graph, fields);
    const creation =
      content.media.length > 1
        ? await carouselContainer(content.media.map(itemFields), wordsOf(content), make)
        : await make({ ...singleFields(content), ...wordsOf(content) });
    const published = await graphPost<{ id: string }>(graph.version, `/${graph.ig}/media_publish`, graph.token, { creation_id: creation }, graph.base);
    const post = await graphGet<{ permalink?: string }>(graph.version, `/${published.id}`, graph.token, { fields: 'permalink' }, graph.base);
    const commentError = await firstComment(graph, published.id, content);
    return { external_id: published.id, permalink: post.permalink ?? '', ...(commentError ? { first_comment_error: commentError } : {}) };
  },
};
