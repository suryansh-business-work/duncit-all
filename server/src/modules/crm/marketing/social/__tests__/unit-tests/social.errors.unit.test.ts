/**
 * Meta's refusals in words a marketer can act on, and which ones mean the
 * account must be reconnected or the send tried again. The raw provider text
 * comes through only for a permission refusal, where it names what to add.
 */
import { SocialApiError } from '../../providers/http';
import { mapSendError } from '../../social.errors';

const meta = (code: number | undefined, subcode?: number, expired = false, detail = 'raw provider text') =>
  new SocialApiError('Facebook', 400, detail, expired, { code, subcode });

describe('mapSendError', () => {
  it('explains a closed messaging window (code 10, subcode 2018278) without asking to reconnect', () => {
    expect(mapSendError(meta(10, 2018278))).toEqual({
      message: 'The messaging window has closed: this person last wrote more than 24 hours ago.',
      reconnect: false,
      retryable: false,
    });
  });

  it('says the person is unavailable for code 551', () => {
    expect(mapSendError(meta(551))).toMatchObject({ reconnect: false, retryable: false, message: expect.stringContaining('not available') });
  });

  it('asks for a reconnect when the token is dead (code 190 or a 401)', () => {
    expect(mapSendError(meta(190))).toMatchObject({ reconnect: true, message: expect.stringContaining('Reconnect it') });
    expect(mapSendError(new SocialApiError('Instagram', 401, 'expired', true))).toMatchObject({ reconnect: true });
  });

  it('names Meta’s own reason for a refused permission or feature (10, 200, 230) and keeps the account connected', () => {
    for (const code of [10, 200, 230]) {
      const mapped = mapSendError(meta(code, undefined, false, '(#200) To send this you need pages_manage_metadata'));
      expect(mapped).toEqual({
        message: 'Meta refused this for a missing permission or feature — (#200) To send this you need pages_manage_metadata',
        reconnect: false,
        retryable: false,
      });
    }
  });

  it('cuts a long permission reason to one short line', () => {
    expect(mapSendError(meta(10, undefined, false, 'x'.repeat(1000))).message).toHaveLength('Meta refused this for a missing permission or feature — '.length + 300);
  });

  it('marks rate limits and Meta-side blips worth another try', () => {
    for (const code of [4, 17, 32, 613]) expect(mapSendError(meta(code))).toMatchObject({ retryable: true, reconnect: false, message: expect.stringContaining('limiting') });
    for (const code of [1, 2]) expect(mapSendError(meta(code))).toMatchObject({ retryable: true, message: expect.stringContaining('temporary') });
  });

  it('falls back to a plain refusal, never the provider text', () => {
    const mapped = mapSendError(meta(100, undefined, false, 'secret-looking raw text'));
    expect(mapped).toEqual({ message: 'The network refused the message.', reconnect: false, retryable: false });
    expect(mapSendError(meta(undefined)).message).toBe('The network refused the message.');
  });

  it('treats anything that is not a network answer as unreachable', () => {
    expect(mapSendError(new Error('socket hang up'))).toEqual({ message: 'The network could not be reached. Try again in a minute.', reconnect: false, retryable: true });
    expect(mapSendError('weird')).toMatchObject({ retryable: true });
  });
});

describe('SocialApiError codes', () => {
  it('keeps Meta’s code and subcode, and null when none were sent', () => {
    expect(meta(10, 2018278)).toMatchObject({ code: 10, subcode: 2018278 });
    expect(new SocialApiError('X', 500, 'boom', false)).toMatchObject({ code: null, subcode: null, message: 'X: boom' });
  });
});
