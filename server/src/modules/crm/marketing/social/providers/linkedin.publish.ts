import { outboundFetch } from '@utils/outboundFetch';
import type { SocialAccountHandle, SocialPublisher } from '../social.types';
import { SocialApiError, bearer, downloadImage, postJson } from './http';
import { LINKEDIN_API, LINKEDIN_SERVICE, linkedinHeaders, orgUrn } from './linkedin';

/**
 * Posting as a LinkedIn Page, through the Posts API.
 *
 * `commentary` is LinkedIn's "little text" format: a handful of characters
 * are markup and must be escaped or the post is cut off at the first one, and
 * a hashtag is only a hashtag when it is written as its template.
 */
const RESERVED = /[\\|{}@[\]()<>#*_~]/g;
const HASHTAG = /(#[\p{L}\p{N}_]+)/u;

const escapeLittle = (text: string) => text.replaceAll(RESERVED, (char) => `\\${char}`);

export function littleText(text: string): string {
  return text
    .split(HASHTAG)
    .map((part, index) => (index % 2 === 1 ? `{hashtag|\\#|${escapeLittle(part.slice(1))}}` : escapeLittle(part)))
    .join('');
}

/** Register the image with LinkedIn, upload its bytes, and hand back its URN. */
async function uploadImage(account: SocialAccountHandle, version: string, mediaUrl: string): Promise<string> {
  const { body } = await postJson<{ value?: { uploadUrl?: string; image?: string } }>(
    LINKEDIN_SERVICE,
    `${LINKEDIN_API}/images?action=initializeUpload`,
    { initializeUploadRequest: { owner: orgUrn(account.external_id) } },
    linkedinHeaders(account.access_token, version)
  );
  const uploadUrl = body.value?.uploadUrl;
  const image = body.value?.image;
  if (!uploadUrl || !image) throw new SocialApiError(LINKEDIN_SERVICE, 502, 'LinkedIn did not return an upload address', false);
  const { bytes, type } = await downloadImage(LINKEDIN_SERVICE, mediaUrl);
  const put = await outboundFetch(LINKEDIN_SERVICE, uploadUrl, {
    method: 'PUT',
    headers: { ...bearer(account.access_token), 'content-type': type },
    body: bytes,
  });
  if (!put.ok) throw new SocialApiError(LINKEDIN_SERVICE, put.status, `image upload failed (HTTP ${put.status})`, put.status === 401);
  return image;
}

export const linkedinPublisher: SocialPublisher = {
  async publish(account, content, creds) {
    const post: Record<string, unknown> = {
      author: orgUrn(account.external_id),
      commentary: littleText(content.text),
      visibility: 'PUBLIC',
      distribution: { feedDistribution: 'MAIN_FEED', targetEntities: [], thirdPartyDistributionChannels: [] },
      lifecycleState: 'PUBLISHED',
      isReshareDisabledByAuthor: false,
    };
    if (content.media_type === 'IMAGE') {
      post.content = { media: { id: await uploadImage(account, creds.version, content.media_url) } };
    }
    const { headers } = await postJson(
      LINKEDIN_SERVICE,
      `${LINKEDIN_API}/posts`,
      post,
      linkedinHeaders(account.access_token, creds.version)
    );
    const urn = headers.get('x-restli-id') ?? '';
    return { external_id: urn, permalink: urn ? `https://www.linkedin.com/feed/update/${urn}` : '' };
  },
};
