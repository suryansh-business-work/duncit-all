import { videoSourceUrl } from '@utils/url';
import type { SocialPublisher } from '../social.types';
import { graphPost } from './meta';

/**
 * Posting to a Facebook Page with its Page token. A photo or a video goes
 * through its own edge — both take the file by URL, so nothing is uploaded
 * from here — and plain text goes to the feed.
 */
export const facebookPublisher: SocialPublisher = {
  async publish(account, content, creds) {
    const page = account.external_id;
    const token = account.access_token;
    if (content.media_type === 'VIDEO') {
      const video = await graphPost<{ id: string }>(creds.version, `/${page}/videos`, token, {
        file_url: videoSourceUrl(content.media_url),
        description: content.text,
      });
      return { external_id: video.id, permalink: `https://www.facebook.com/${page}/videos/${video.id}` };
    }
    if (content.media_type === 'IMAGE') {
      const photo = await graphPost<{ id: string; post_id?: string }>(creds.version, `/${page}/photos`, token, {
        url: content.media_url,
        caption: content.text,
        published: 'true',
      });
      const id = photo.post_id ?? photo.id;
      return { external_id: id, permalink: `https://www.facebook.com/${id}` };
    }
    const post = await graphPost<{ id: string }>(creds.version, `/${page}/feed`, token, { message: content.text });
    return { external_id: post.id, permalink: `https://www.facebook.com/${post.id}` };
  },
};
