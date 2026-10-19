import { describe, expect, it } from 'vitest';
import {
  applyEmoji,
  applyMention,
  emojiQuery,
  filterMentionCandidates,
  mentionHandle,
  mentionIdsInText,
  mentionQuery,
  mentionTarget,
  splitMentions,
} from '../src/chat-mentions';

const members = [
  { user_id: 'u1', full_name: 'Asha Rao' },
  { user_id: 'u2', full_name: 'Ravi Kumar' },
  { user_id: 'u3', full_name: 'Arjun Mehta' },
  { user_id: 'me', full_name: 'Amit Shah' },
];

describe('mentionHandle', () => {
  it('uses the first name as the token after @', () => {
    expect(mentionHandle('Asha Rao')).toBe('Asha');
  });

  it('strips characters the token reader would stop at', () => {
    expect(mentionHandle("D'Souza Ann")).toBe('DSouza');
  });

  it('falls back to the squeezed name, then to "member", when no token characters remain', () => {
    expect(mentionHandle('  ')).toBe('member');
    expect(mentionHandle('आशा राव')).toBe('member');
    expect(mentionHandle('आशा Rao')).toBe('Rao');
  });
});

describe('filterMentionCandidates', () => {
  it('matches the start of the name or of any word, case-insensitively', () => {
    expect(filterMentionCandidates(members, 'ku', 'me').map((m) => m.user_id)).toEqual(['u2']);
    expect(filterMentionCandidates(members, 'A', 'me').map((m) => m.user_id)).toEqual(['u1', 'u3']);
  });

  it('never offers the writer themselves', () => {
    expect(filterMentionCandidates(members, 'amit', 'me')).toEqual([]);
  });

  it('offers everyone (but the writer) for a bare @, capped at the limit', () => {
    expect(filterMentionCandidates(members, '', 'me', 2).map((m) => m.user_id)).toEqual(['u1', 'u2']);
  });

  it('lists a member who appears twice (host and attendee) once', () => {
    const twice = [members[0], members[0]];
    expect(filterMentionCandidates(twice, '', null)).toHaveLength(1);
  });
});

describe('mentionIdsInText', () => {
  it('keeps each picked member whose handle is still in the text', () => {
    expect(mentionIdsInText('hey @Asha and @Ravi', [members[0], members[1]])).toEqual(['u1', 'u2']);
  });

  it('drops a pick whose mention was deleted before sending', () => {
    expect(mentionIdsInText('hey Asha', [members[0]])).toEqual([]);
  });

  it('lists a member once even when picked twice', () => {
    expect(mentionIdsInText('@Asha @asha', [members[0], members[0]])).toEqual(['u1']);
  });
});

describe('mentionTarget', () => {
  it('resolves a tapped token to the mentioned user', () => {
    expect(mentionTarget('@ravi', members)).toBe('u2');
  });

  it('returns null for an @ that named nobody mentioned', () => {
    expect(mentionTarget('@nobody', members)).toBeNull();
  });
});

describe('lifted staff-chat helpers', () => {
  it('still finds and replaces the half-typed mention under the caret', () => {
    expect(mentionQuery('hi @As', 6)).toBe('As');
    expect(applyMention('hi @As', 6, 'Asha')).toEqual({ text: 'hi @Asha ', caret: 9 });
  });

  it('adds no second space when a mention is inserted mid-sentence', () => {
    expect(applyMention('hi @As there', 6, 'Asha')).toEqual({ text: 'hi @Asha there', caret: 8 });
  });

  it('leaves the text alone when the caret is not in a mention', () => {
    expect(mentionQuery('hi there', 8)).toBeNull();
    expect(applyMention('hi there', 8, 'Asha')).toEqual({ text: 'hi there', caret: 8 });
  });

  it('reads a :shortcode only once a letter follows the colon', () => {
    expect(emojiQuery('nice :smi', 9)).toBe('smi');
    expect(emojiQuery('Ready to ship:', 14)).toBeNull();
    expect(emojiQuery('nice :smi later', 4)).toBeNull();
  });

  it('swaps the :shortcode under the caret for the emoji and keeps what follows', () => {
    expect(applyEmoji('nice :smi ok', 9, '😄')).toEqual({ text: 'nice 😄 ok', caret: 7 });
    expect(applyEmoji('no code', 7, '😄')).toEqual({ text: 'no code', caret: 7 });
  });

  it('still splits text into plain and mention pieces', () => {
    expect(splitMentions('a @Asha b')).toEqual([
      { text: 'a ', mention: false },
      { text: '@Asha', mention: true },
      { text: ' b', mention: false },
    ]);
  });
});
