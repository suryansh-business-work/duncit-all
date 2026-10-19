import { describe, expect, it } from 'vitest';
import {
  applyMention,
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

  it('still splits text into plain and mention pieces', () => {
    expect(splitMentions('a @Asha b')).toEqual([
      { text: 'a ', mention: false },
      { text: '@Asha', mention: true },
      { text: ' b', mention: false },
    ]);
  });
});
