import { FIRST_COMMENT_MAX, contentFor, publishContent, publishProblems } from '../../social.rules';
import type { PublishContent, PublishMedia } from '../../social.types';

const IMAGE = 'https://ik.imagekit.io/duncit/a.jpg';
const VIDEO = 'https://ik.imagekit.io/duncit/b.mp4';
const picture = (width?: number, height?: number): PublishMedia => ({ url: IMAGE, type: 'IMAGE', width, height });
const clip = (duration_s?: number, width?: number, height?: number): PublishMedia => ({ url: VIDEO, type: 'VIDEO', duration_s, width, height });
const content = (text: string, media: PublishMedia[], over: Partial<PublishContent> = {}): PublishContent => ({ ...publishContent(text, media), ...over });

describe('publishContent', () => {
  it('keeps only real measurements, rounded, so an unmeasured piece reads as before', () => {
    expect(publishContent('x', [picture(), clip(0)]).media).toEqual([
      { url: IMAGE, type: 'IMAGE' },
      { url: VIDEO, type: 'VIDEO' },
    ]);
    expect(publishContent('x', [picture(1080.4, 1349.6), clip(12.5, 1080)]).media).toEqual([
      { url: IMAGE, type: 'IMAGE', width: 1080, height: 1350 },
      { url: VIDEO, type: 'VIDEO', duration_s: 12.5 },
    ]);
  });
});

describe('contentFor', () => {
  it('gives a network its own caption, and the post text where it has none or a blank one', () => {
    const post = content('Default', [], { captions: { THREADS: '  Short one  ', X: '   ' } });
    expect(contentFor('THREADS', post).text).toBe('Short one');
    expect(contentFor('X', post).text).toBe('Default');
    expect(contentFor('FACEBOOK', post).text).toBe('Default');
  });
});

describe('publishProblems — what was already checked', () => {
  it('wants Instagram media, YouTube text and video, and respects each network’s length and media limits', () => {
    expect(publishProblems('INSTAGRAM', content('Hi', []))).toEqual(['Instagram needs image or video media']);
    expect(publishProblems('YOUTUBE', content('', [picture()]))).toEqual(['YouTube needs text', 'YouTube cannot take image from Duncit yet']);
    expect(publishProblems('X', content('x'.repeat(281), []))).toEqual(['X allows 280 characters']);
    expect(publishProblems('FACEBOOK', content('', [picture(), clip()]))).toEqual(['Facebook takes one video on its own, not in a carousel']);
    expect(publishProblems('THREADS', content('', []))).toEqual(['Threads: write something or add media']);
    expect(publishProblems('LINKEDIN', content('Hello', [picture()]))).toEqual([]);
  });
});

describe('publishProblems — captions per network', () => {
  it('checks each network against its own caption', () => {
    const post = content('x'.repeat(600), [picture(1080, 1080)], { captions: { THREADS: 'Fits in Threads' } });
    expect(publishProblems('THREADS', post)).toEqual([]);
    expect(publishProblems('X', post)).toEqual(['X allows 280 characters']);
  });
});

describe('publishProblems — post types', () => {
  it('refuses a reel or story anywhere but Instagram', () => {
    expect(publishProblems('FACEBOOK', content('', [clip()], { post_type: 'REEL' }))).toEqual(['Facebook takes no reels from Duncit — post it to Instagram only']);
    expect(publishProblems('THREADS', content('', [picture()], { post_type: 'STORY' }))).toEqual(['Threads takes no stories from Duncit — post it to Instagram only']);
  });

  it('wants a reel to be one video and a story one piece', () => {
    expect(publishProblems('INSTAGRAM', content('', [picture()], { post_type: 'REEL' }))).toEqual(['An Instagram reel is one video']);
    expect(publishProblems('INSTAGRAM', content('', [clip(), clip()], { post_type: 'REEL' }))).toEqual(['An Instagram reel is one video']);
    expect(publishProblems('INSTAGRAM', content('', [picture(), picture()], { post_type: 'STORY' }))).toEqual(['An Instagram story is one picture or one video']);
    expect(publishProblems('INSTAGRAM', content('', [clip(30)], { post_type: 'REEL' }))).toEqual([]);
    expect(publishProblems('INSTAGRAM', content('', [picture(1080, 1920)], { post_type: 'STORY' }))).toEqual([]);
  });
});

describe('publishProblems — Instagram shape and length', () => {
  it('holds feed pictures and carousel items to 4:5 – 1.91:1, with room for rounding, and lets a story take any shape', () => {
    expect(publishProblems('INSTAGRAM', content('', [picture(1080, 1350)]))).toEqual([]);
    expect(publishProblems('INSTAGRAM', content('', [picture(1910, 1000)]))).toEqual([]);
    expect(publishProblems('INSTAGRAM', content('', [picture(1080, 1920)]))).toEqual([
      'Media 1 is 1080×1920; an Instagram feed post takes 4:5 (portrait) to 1.91:1 (landscape) — crop it, or post it as a story',
    ]);
    expect(publishProblems('INSTAGRAM', content('', [picture(1080, 1080), picture(3000, 1000)]))).toEqual([
      'Media 2 is 3000×1000; an Instagram feed post takes 4:5 (portrait) to 1.91:1 (landscape) — crop it, or post it as a story',
    ]);
    // A single feed video goes out as a reel, which takes a tall frame.
    expect(publishProblems('INSTAGRAM', content('', [clip(20, 1080, 1920)]))).toEqual([]);
    // Nothing measured, nothing judged.
    expect(publishProblems('INSTAGRAM', content('', [picture()]))).toEqual([]);
  });

  it('holds a reel to 3 seconds – 15 minutes, a carousel video and a story video to 60 seconds, a Threads video to 5 minutes', () => {
    expect(publishProblems('INSTAGRAM', content('', [clip(2)], { post_type: 'REEL' }))).toEqual(['Media 1 runs 2 seconds; Instagram takes 3 seconds to 15 minutes']);
    expect(publishProblems('INSTAGRAM', content('', [clip(901)]))).toEqual(['Media 1 runs 901 seconds; Instagram takes 3 seconds to 15 minutes']);
    expect(publishProblems('INSTAGRAM', content('', [picture(1080, 1080), clip(61, 1080, 1080)]))).toEqual(['Media 2 runs 61 seconds; Instagram takes up to 60 seconds here']);
    expect(publishProblems('INSTAGRAM', content('', [clip(75)], { post_type: 'STORY' }))).toEqual(['Media 1 runs 75 seconds; Instagram takes up to 60 seconds here']);
    expect(publishProblems('THREADS', content('', [clip(301)]))).toEqual(['Media 1 runs 301 seconds; Threads takes up to 5 minutes here']);
    expect(publishProblems('FACEBOOK', content('', [clip(3600)]))).toEqual([]);
  });
});

describe('publishProblems — the Instagram first comment', () => {
  it('refuses one on a story or past the length limit, and is not Facebook’s concern', () => {
    expect(publishProblems('INSTAGRAM', content('', [picture()], { post_type: 'STORY', first_comment: 'Hi' }))).toEqual(['An Instagram story takes no first comment']);
    expect(publishProblems('INSTAGRAM', content('', [picture()], { first_comment: 'c'.repeat(FIRST_COMMENT_MAX + 1) }))).toEqual([
      `An Instagram first comment allows ${FIRST_COMMENT_MAX} characters`,
    ]);
    expect(publishProblems('INSTAGRAM', content('', [picture()], { first_comment: 'Book now' }))).toEqual([]);
    expect(publishProblems('FACEBOOK', content('Hi', [], { first_comment: 'c'.repeat(FIRST_COMMENT_MAX + 1) }))).toEqual([]);
  });
});
