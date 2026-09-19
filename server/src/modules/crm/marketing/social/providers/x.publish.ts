import type { SocialAccountHandle, SocialPublisher } from '../social.types';
import { bearer, downloadImage, postJson, socialJson } from './http';
import { X_API, X_SERVICE } from './x';

/**
 * Posting to X with the account's user token. An image is uploaded first —
 * X takes media only as bytes, never as a URL — and the post names it by id.
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
    if (content.media_type === 'IMAGE') {
      post.media = { media_ids: [await uploadImage(account, content.media_url)] };
    }
    const { body } = await postJson<{ data?: { id?: string } }>(X_SERVICE, `${X_API}/tweets`, post, bearer(account.access_token));
    const id = body.data?.id ?? '';
    return { external_id: id, permalink: id ? `https://x.com/${account.handle || 'i'}/status/${id}` : '' };
  },
};
