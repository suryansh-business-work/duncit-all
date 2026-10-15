/**
 * The YouTube link an owner pastes beside an uploaded clip — one rule for the
 * Partners venue form, the Venues console editor, the menu editor and the
 * native desk. Assertions on messages are on KEYS.
 */
import { describe, expect, it } from 'vitest';

import { makeYoutubeLinkSchema, youtubeLinkDefaults } from '../src/schemas';

const t = (key: string) => key;
const schema = makeYoutubeLinkSchema(t);
const ID = 'dQw4w9WgXcQ';

const issuesFor = (url: string) => {
  const result = schema.safeParse({ url });
  return result.success ? [] : result.error.issues.map((issue) => `${issue.path.join('.')}=${issue.message}`);
};

describe('makeYoutubeLinkSchema', () => {
  it('takes a YouTube video link and trims it', () => {
    expect(schema.parse({ url: `  https://youtu.be/${ID}  ` })).toEqual({ url: `https://youtu.be/${ID}` });
    expect(issuesFor(`https://www.youtube.com/shorts/${ID}`)).toEqual([]);
  });

  it('refuses another host, a channel page, a bare domain and a blank field', () => {
    for (const url of [
      'https://vimeo.com/123456',
      'https://www.youtube.com/channel/UC123',
      `youtube.com/watch?v=${ID}`,
      `https://youtube.com.evil.example/watch?v=${ID}`,
      '',
      '   ',
    ]) {
      expect(issuesFor(url)).toEqual(['url=venueFoodOwner.videos.youtubeInvalid']);
    }
  });

  it('starts blank', () => {
    expect(youtubeLinkDefaults).toEqual({ url: '' });
    expect(issuesFor(youtubeLinkDefaults.url)).toEqual(['url=venueFoodOwner.videos.youtubeInvalid']);
  });
});
