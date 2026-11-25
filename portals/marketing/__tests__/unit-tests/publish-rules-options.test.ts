import { describe, expect, it } from 'vitest';
import { FIRST_COMMENT_MAX, PUBLISH_RULES, platformProblems } from '../../src/pages/social-accounts-page/social-post-form/publish-rules';
import type { SocialPostMedia } from '../../src/pages/social-accounts-page/publish.queries';

const IMAGE = 'https://ik.imagekit.io/duncit/a.jpg';
const VIDEO = 'https://ik.imagekit.io/duncit/b.mp4';
const picture = (width?: number, height?: number): SocialPostMedia => ({ url: IMAGE, type: 'IMAGE', width, height });
const clip = (duration_s?: number, width?: number, height?: number): SocialPostMedia => ({ url: VIDEO, type: 'VIDEO', duration_s, width, height });
const keys = (problems: ReturnType<typeof platformProblems>) => problems.map((problem) => `${problem.field}:${problem.key}`);

describe('publish-rules — the same table as the server', () => {
  it('gives reels, stories and a first comment to Instagram alone', () => {
    expect(PUBLISH_RULES.INSTAGRAM.postTypes).toEqual(['FEED', 'REEL', 'STORY']);
    expect(Object.entries(PUBLISH_RULES).filter(([, rules]) => rules.postTypes.length > 1 || rules.firstComment).map(([platform]) => platform)).toEqual(['INSTAGRAM']);
  });
});

describe('platformProblems — captions per network', () => {
  it('judges a network by its own caption, and puts its problems on that caption', () => {
    const long = 'x'.repeat(300);
    expect(keys(platformProblems('X', long, [], { captions: { X: 'Short for X' } }))).toEqual([]);
    expect(keys(platformProblems('X', 'fine', [], { captions: { X: 'y'.repeat(281) } }))).toEqual(['captions.X:marketing.social.ruleTooLong']);
    expect(keys(platformProblems('X', long, [], { captions: { X: '   ' } }))).toEqual(['text:marketing.social.ruleTooLong']);
    expect(keys(platformProblems('LINKEDIN', '', [], { captions: { X: 'Not LinkedIn' } }))).toEqual(['text:marketing.social.ruleNeedsText']);
  });
});

describe('platformProblems — post types', () => {
  it('refuses a reel or story anywhere but Instagram', () => {
    expect(keys(platformProblems('FACEBOOK', '', [clip()], { post_type: 'REEL' }))).toEqual(['post_type:marketing.social.ruleNoReels']);
    expect(keys(platformProblems('THREADS', '', [picture()], { post_type: 'STORY' }))).toEqual(['post_type:marketing.social.ruleNoStories']);
  });

  it('wants a reel to be one video and a story one piece', () => {
    expect(keys(platformProblems('INSTAGRAM', '', [picture()], { post_type: 'REEL' }))).toEqual(['media:marketing.social.ruleReelOneVideo']);
    expect(keys(platformProblems('INSTAGRAM', '', [picture(), picture()], { post_type: 'STORY' }))).toEqual(['media:marketing.social.ruleStoryOnePiece']);
    expect(keys(platformProblems('INSTAGRAM', '', [clip(30)], { post_type: 'REEL' }))).toEqual([]);
  });
});

describe('platformProblems — Instagram shape and length', () => {
  it('holds feed pictures and carousel items to 4:5 – 1.91:1, naming the piece and its size', () => {
    expect(platformProblems('INSTAGRAM', '', [picture(1080, 1350)])).toEqual([]);
    expect(platformProblems('INSTAGRAM', '', [picture(1080, 1080), picture(1080, 1920)])).toEqual([
      { field: 'media', key: 'marketing.social.ruleFeedRatio', vars: { index: 2, width: 1080, height: 1920 } },
    ]);
    expect(platformProblems('INSTAGRAM', '', [picture(1080, 1920)], { post_type: 'STORY' })).toEqual([]);
    expect(platformProblems('INSTAGRAM', '', [clip(20, 1080, 1920)])).toEqual([]);
  });

  it('holds video length to each kind of post, and judges nothing it could not measure', () => {
    expect(platformProblems('INSTAGRAM', '', [clip(2)], { post_type: 'REEL' })).toEqual([
      { field: 'media', key: 'marketing.social.ruleVideoTooShort', vars: { index: 1, seconds: 2, min: 3 } },
    ]);
    expect(platformProblems('INSTAGRAM', '', [clip(75.4)], { post_type: 'STORY' })).toEqual([
      { field: 'media', key: 'marketing.social.ruleVideoTooLong', vars: { index: 1, seconds: 75, max: 60 } },
    ]);
    expect(keys(platformProblems('INSTAGRAM', '', [picture(1080, 1080), clip(61)]))).toEqual(['media:marketing.social.ruleVideoTooLong']);
    expect(keys(platformProblems('THREADS', '', [clip(301)]))).toEqual(['media:marketing.social.ruleVideoTooLong']);
    expect(platformProblems('FACEBOOK', '', [clip(3600)])).toEqual([]);
    expect(platformProblems('INSTAGRAM', '', [clip(), picture()])).toEqual([]);
  });
});

describe('platformProblems — the first comment', () => {
  it('refuses one on a story or past its length, and is nothing to a network without one', () => {
    expect(keys(platformProblems('INSTAGRAM', '', [picture()], { post_type: 'STORY', first_comment: 'Hi' }))).toEqual(['first_comment:marketing.social.ruleStoryNoComment']);
    expect(platformProblems('INSTAGRAM', '', [picture()], { first_comment: 'c'.repeat(FIRST_COMMENT_MAX + 1) })).toEqual([
      { field: 'first_comment', key: 'marketing.social.ruleCommentTooLong', vars: { limit: FIRST_COMMENT_MAX } },
    ]);
    expect(platformProblems('INSTAGRAM', '', [picture()], { first_comment: '   ' })).toEqual([]);
    expect(platformProblems('FACEBOOK', 'Hi', [], { first_comment: 'c'.repeat(FIRST_COMMENT_MAX + 1) })).toEqual([]);
  });
});
