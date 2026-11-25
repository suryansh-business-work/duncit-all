import { logs } from '@observability/log';
import { outboundFetch } from '@utils/outboundFetch';
import type { PublishMedia } from './social.types';

/**
 * The media check before a post is scheduled or sent now: each piece still
 * answers from its address and is the kind the post says, so a post does not
 * fail at 9am because its file was removed from the library at 8. HEAD only —
 * nothing is downloaded.
 *
 * Only what is certainly wrong is refused: an address that answers 404 or 410,
 * or a file of the other kind (a "video" that is an image, or an HTML error
 * page). A host that cannot be reached right now, or will not answer HEAD, is
 * logged and let through — the publisher reports the network's own answer if
 * the post then fails.
 */
const TIMEOUT_MS = 10_000;
const GONE = new Set([404, 410]);
const KIND_PREFIX = { IMAGE: 'image/', VIDEO: 'video/' } as const;
const OTHER_KIND = { IMAGE: 'video/', VIDEO: 'image/' } as const;

function wrongKind(item: PublishMedia, contentType: string): boolean {
  if (!contentType || contentType.startsWith(KIND_PREFIX[item.type])) return false;
  return contentType.startsWith(OTHER_KIND[item.type]) || contentType.startsWith('text/html');
}

async function problemOf(item: PublishMedia, index: number): Promise<string | null> {
  const which = `Media ${index + 1}`;
  try {
    const res = await outboundFetch('Media check', item.url, { method: 'HEAD', signal: AbortSignal.timeout(TIMEOUT_MS) });
    if (GONE.has(res.status)) return `${which} is no longer at its address — pick it again`;
    const contentType = (res.headers.get('content-type') ?? '').toLowerCase();
    if (res.ok && wrongKind(item, contentType)) return `${which} is not ${item.type === 'IMAGE' ? 'an image' : 'a video'} (${contentType})`;
    if (!res.ok) logs.server.warn('social-publish', 'mediaCheck', { url: item.url, status: res.status, msg: 'media check answered without a verdict; let through' });
    return null;
  } catch (error) {
    logs.server.warn('social-publish', 'mediaCheck', { error, url: item.url, msg: 'media check could not reach the media; let through' });
    return null;
  }
}

/** What is certainly wrong with this post's media, in order; empty when every piece checks out. */
export async function mediaReachProblems(media: readonly PublishMedia[]): Promise<string[]> {
  const found = await Promise.all(media.map((item, index) => problemOf(item, index)));
  return found.filter((problem): problem is string => problem !== null);
}
