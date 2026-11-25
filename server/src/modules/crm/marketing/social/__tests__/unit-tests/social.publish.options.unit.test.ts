import { contentOptions, optionsOfDoc, pubOptions, storedOptions } from '../../social.publish.options';

describe('contentOptions', () => {
  it('carries a non-feed type, every caption with text, and a trimmed first comment', () => {
    expect(
      contentOptions({
        post_type: 'REEL',
        captions: [
          { platform: 'THREADS', text: '  Short  ' },
          { platform: 'X', text: '   ' },
        ],
        first_comment: '  Link in bio ',
      })
    ).toEqual({ post_type: 'REEL', captions: { THREADS: 'Short' }, first_comment: 'Link in bio' });
  });

  it('leaves out a feed type, no captions and an empty comment, so a plain post reads as before', () => {
    expect(contentOptions({ post_type: 'FEED', captions: [], first_comment: '  ' })).toEqual({});
    expect(contentOptions({})).toEqual({});
  });

  it('refuses two captions for one network', () => {
    expect(() =>
      contentOptions({
        captions: [
          { platform: 'THREADS', text: 'One' },
          { platform: 'THREADS', text: 'Two' },
        ],
      })
    ).toThrow('Write one caption for THREADS, not two.');
  });
});

describe('storedOptions', () => {
  it('keeps captions only for networks the post goes to, and the first comment only with Instagram', () => {
    const input = {
      post_type: 'STORY' as const,
      captions: [
        { platform: 'THREADS' as const, text: 'For Threads' },
        { platform: 'X' as const, text: 'For X' },
      ],
      first_comment: 'Hi',
    };
    expect(storedOptions(input, ['INSTAGRAM', 'THREADS'])).toEqual({ post_type: 'STORY', captions: [{ platform: 'THREADS', text: 'For Threads' }], first_comment: 'Hi' });
    expect(storedOptions(input, ['FACEBOOK'])).toEqual({ post_type: 'STORY', captions: undefined, first_comment: undefined });
  });

  it('stores a feed type when none is given', () => {
    expect(storedOptions({}, ['X'])).toEqual({ post_type: 'FEED', captions: undefined, first_comment: undefined });
  });
});

describe('reading a stored post back', () => {
  it('turns its options into content for the publisher, and into what the API shows', () => {
    const doc = { post_type: 'REEL' as const, captions: [{ platform: 'THREADS' as const, text: 'T' }], first_comment: 'C' };
    expect(optionsOfDoc(doc)).toEqual({ post_type: 'REEL', captions: { THREADS: 'T' }, first_comment: 'C' });
    expect(pubOptions(doc)).toEqual({ post_type: 'REEL', captions: [{ platform: 'THREADS', text: 'T' }], first_comment: 'C' });
  });

  it('reads a post stored before these options as a plain feed post', () => {
    expect(optionsOfDoc({})).toEqual({});
    expect(pubOptions({ post_type: null, captions: null, first_comment: null })).toEqual({ post_type: 'FEED', captions: [], first_comment: '' });
  });
});
