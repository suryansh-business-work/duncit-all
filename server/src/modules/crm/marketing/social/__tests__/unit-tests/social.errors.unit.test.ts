/**
 * Meta's refusals in words a marketer can act on, and which ones mean the
 * account must be reconnected or the send tried again. The raw provider text
 * never comes through.
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

  it('asks for a reconnect when the messaging permission is missing (10, 200, 230)', () => {
    for (const code of [10, 200, 230]) {
      expect(mapSendError(meta(code))).toMatchObject({ reconnect: true, message: expect.stringContaining('messaging permission') });
    }
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
