/**
 * How a venue's or a dish's stored video plays — a YouTube link (read with
 * @duncit/regex YOUTUBE_URL) or an uploaded clip handed to a player as the
 * stored file. One answer for every surface.
 */
import { describe, expect, it } from 'vitest';

import { VENUE_VIDEO_FOLDER, venueVideoOf, venueVideosOf, youtubeVideoId } from '../src/schemas';

const ID = 'dQw4w9WgXcQ';
const CLIP = 'https://ik.imagekit.io/duncit/venues/v1/clip.mp4';

describe('youtubeVideoId', () => {
  it('reads the 11-character id from every YouTube link shape', () => {
    for (const url of [
      `https://www.youtube.com/watch?v=${ID}`,
      `https://youtu.be/${ID}?si=share`,
      `https://www.youtube.com/shorts/${ID}`,
      `https://www.youtube.com/embed/${ID}`,
      `http://m.youtube.com/live/${ID}`,
    ]) {
      expect(youtubeVideoId(url)).toBe(ID);
    }
  });

  it('trims the link before reading it', () => {
    expect(youtubeVideoId(`  https://youtu.be/${ID}  `)).toBe(ID);
  });

  it('is null for an uploaded clip, another host, a malformed id or nothing', () => {
    expect(youtubeVideoId(CLIP)).toBeNull();
    expect(youtubeVideoId('https://vimeo.com/123456')).toBeNull();
    expect(youtubeVideoId('https://youtu.be/short')).toBeNull();
    expect(youtubeVideoId('')).toBeNull();
    expect(youtubeVideoId(null)).toBeNull();
    expect(youtubeVideoId(undefined)).toBeNull();
  });
});

describe('venueVideoOf', () => {
  it('plays a YouTube link through the privacy-enhanced embed, with a watch link and a still', () => {
    expect(venueVideoOf(` https://www.youtube.com/watch?v=${ID}&t=42s `)).toEqual({
      kind: 'YOUTUBE',
      url: `https://www.youtube.com/watch?v=${ID}&t=42s`,
      id: ID,
      embedUrl: `https://www.youtube-nocookie.com/embed/${ID}`,
      watchUrl: `https://www.youtube.com/watch?v=${ID}`,
      thumbnailUrl: `https://i.ytimg.com/vi/${ID}/hqdefault.jpg`,
    });
  });

  it('plays an uploaded ImageKit clip as the stored file, never a metered re-encode', () => {
    expect(venueVideoOf(CLIP)).toEqual({ kind: 'FILE', url: CLIP, sourceUrl: `${CLIP}?tr=orig-true` });
  });

  it('hands any other address to the player unchanged', () => {
    const other = 'https://cdn.example.test/clip.mp4';
    expect(venueVideoOf(other)).toEqual({ kind: 'FILE', url: other, sourceUrl: other });
  });

  it('is null for a blank entry', () => {
    expect(venueVideoOf('')).toBeNull();
    expect(venueVideoOf('   ')).toBeNull();
    expect(venueVideoOf(null)).toBeNull();
    expect(venueVideoOf(undefined)).toBeNull();
  });
});

describe('venueVideosOf', () => {
  it('keeps every playable video in the owner’s order and drops blanks', () => {
    const videos = venueVideosOf([CLIP, '', null, `https://youtu.be/${ID}`, undefined, '  ']);
    expect(videos.map((video) => video.kind)).toEqual(['FILE', 'YOUTUBE']);
    expect(videos[1]).toMatchObject({ id: ID });
  });

  it('answers no videos for none', () => {
    expect(venueVideosOf([])).toEqual([]);
    expect(venueVideosOf(null)).toEqual([]);
    expect(venueVideosOf(undefined)).toEqual([]);
  });
});

describe('VENUE_VIDEO_FOLDER', () => {
  it('files uploads under the venues folder (the server adds the venue id)', () => {
    expect(VENUE_VIDEO_FOLDER).toBe('/venues');
  });
});
