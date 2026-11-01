import type { SocialAccountHandle, SocialPublisher } from '../social.types';
import { bearer, downloadImage, postJson, socialJson } from './http';
import { X_API, X_SERVICE } from './x';

/**
 * Posting to X with the account's user token. Each image is uploaded first —
 * X takes media only as bytes, never as a URL — and the post names them by
 * id, up to the four X allows (the rules refuse more before a post reaches here).
 */
async function uploadImage(account: SocialAccountHandle, mediaUrl: string): Promise<string> {
  const { bytes, type } = await downloadImage(X_SERVICE, mediaUrl);
  const form = new FormData();
  form.append('media', new Blob([bytes], { type }), 'image');
  form.append('media_category', 'tweet_image');
  const res = await socialJson<{ data?: { id?: string } }>(X_SERVICE, `${X_API}/media/upload`, {
    method: 'POST',
    headers: bearer(account.access_token),
    body: form,
  });
  return res.data?.id ?? '';
}

export const xPublisher: SocialPublisher = {
  async publish(account, content) {
    const post: Record<string, unknown> = { text: content.text };
    const media_ids: string[] = [];
    for (const item of content.media.filter((m) => m.type === 'IMAGE')) media_ids.push(await uploadImage(account, item.url));
    if (media_ids.length > 0) post.media = { media_ids };
    const { body } = await postJson<{ data?: { id?: string } }>(X_SERVICE, `${X_API}/tweets`, post, bearer(account.access_token));
    const id = body.data?.id ?? '';
    return { external_id: id, permalink: id ? `https://x.com/${account.handle || 'i'}/status/${id}` : '' };
  },
};
