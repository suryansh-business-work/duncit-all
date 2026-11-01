/**
 * Instagram collaborators end to end in miniature: the handle rules and the
 * API cap, the field the Instagram publisher adds to a container, and the
 * caption pieces (hashtags, the length budget that always keeps the link).
 */
import { MAX_INSTAGRAM_COLLABORATORS, normalizeCollaborators } from '../../../social/social.collaborators';
import { collaboratorFields } from '../../../social/providers/instagram.publish';
import { PUBLISH_RULES } from '../../../social/social.rules';
import { cleanHashtags, postText } from '../../podPromo.ai';

describe('normalizeCollaborators', () => {
  it('strips @ and profile links, lowercases and de-duplicates', () => {
    expect(normalizeCollaborators(['@Blue.Cafe', 'https://www.instagram.com/riya_dances/', 'blue.cafe'])).toEqual(['blue.cafe', 'riya_dances']);
  });

  it('treats null and empty entries as none', () => {
    expect(normalizeCollaborators(null)).toEqual([]);
    expect(normalizeCollaborators(['', '  '])).toEqual([]);
  });

  it('refuses a name Instagram would reject', () => {
    expect(() => normalizeCollaborators(['bad..name'])).toThrow('@bad..name is not an Instagram username.');
    expect(() => normalizeCollaborators(['.dot'])).toThrow(/not an Instagram username/);
  });

  it('caps at the Instagram API limit of 3', () => {
    expect(MAX_INSTAGRAM_COLLABORATORS).toBe(3);
    expect(normalizeCollaborators(['a', 'b', 'c'])).toHaveLength(3);
    expect(() => normalizeCollaborators(['a', 'b', 'c', 'd'])).toThrow('Instagram takes at most 3 collaborators on a post.');
  });

  it('only Instagram has collaborators in the rules table', () => {
    const withCollab = Object.entries(PUBLISH_RULES).filter(([, rules]) => rules.maxCollaborators > 0);
    expect(withCollab.map(([platform]) => platform)).toEqual(['INSTAGRAM']);
  });
});

describe('collaboratorFields', () => {
  const content = { text: 'hi', media: [], media_url: '', media_type: null };
  it('sends the names as a JSON list', () => {
    expect(collaboratorFields({ ...content, collaborators: ['a', 'b'] })).toEqual({ collaborators: '["a","b"]' });
  });
  it('adds nothing when there are none, so a plain post is unchanged', () => {
    expect(collaboratorFields(content)).toEqual({});
    expect(collaboratorFields({ ...content, collaborators: [] })).toEqual({});
  });
});

describe('caption pieces', () => {
  it('cleans hashtags: no #, no spaces or punctuation, unique, at most twelve', () => {
    expect(cleanHashtags(['#Pune', 'pune', 'run club', 'yoga!', 'ok_2'])).toEqual(['pune', 'ok_2']);
    expect(cleanHashtags(Array.from({ length: 20 }, (_, i) => `tag${i}`))).toHaveLength(12);
  });

  it('keeps the booking link and hashtags whole and cuts the caption to fit Instagram', () => {
    const text = postText({ caption: 'x'.repeat(5000), hashtags: ['pune'], ai: true }, 'Book your spot: https://duncit.com/abc');
    expect([...text].length).toBeLessThanOrEqual(PUBLISH_RULES.INSTAGRAM.maxText);
    expect(text.endsWith('Book your spot: https://duncit.com/abc\n\n#pune')).toBe(true);
    expect(text).toContain('…');
  });

  it('leaves a short caption as written', () => {
    expect(postText({ caption: 'Come run', hashtags: [], ai: false }, 'Book: link')).toBe('Come run\n\nBook: link');
  });
});
