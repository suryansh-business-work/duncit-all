import crypto from 'node:crypto';
import { assertCaptcha, checkCaptcha, issueCaptcha, normaliseAnswer, resetCaptchaState } from '../../captcha.service';
import { requireHuman } from '../../captcha.guard';
import { generateCaptchaCode, renderCaptchaImage } from '../../captcha.image';

jest.mock('../../captcha.image', () => ({
  CAPTCHA_LENGTH: 5,
  generateCaptchaCode: jest.fn(),
  renderCaptchaImage: jest.fn(),
}));

const code = (value = 'AB3CD') => {
  (generateCaptchaCode as jest.Mock).mockReturnValue(value);
  (renderCaptchaImage as jest.Mock).mockReturnValue(`image-of-${value}`);
};
const sign = (body: string) => crypto.createHmac('sha256', process.env.JWT_SECRET || 'dev-secret').update(body).digest('base64url');
/** A token minted by hand, so a payload can be anything. */
const forged = (payload: unknown) => {
  const body = Buffer.from(typeof payload === 'string' ? payload : JSON.stringify(payload)).toString('base64url');
  return `c1.${body}.${sign(body)}`;
};

beforeEach(() => {
  resetCaptchaState();
  code();
});
afterEach(() => jest.useRealTimers());

describe('normaliseAnswer', () => {
  it('forgives case and stray characters, and reads nothing as empty', () => {
    expect(normaliseAnswer(' ab-3 cd ')).toBe('AB3CD');
    expect(normaliseAnswer('')).toBe('');
    expect(normaliseAnswer(undefined as never)).toBe('');
  });
});

describe('issueCaptcha', () => {
  it('hands out a picture, a signed token and its lifetime, without the answer anywhere in the token', () => {
    const challenge = issueCaptcha();
    expect(challenge.image).toBe('image-of-AB3CD');
    expect(challenge.expires_in).toBe(600);
    expect(challenge.token.startsWith('c1.')).toBe(true);
    expect(Buffer.from(challenge.token.split('.')[1], 'base64url').toString()).not.toContain('AB3CD');
  });

  it('mints a different token every time', () => {
    expect(issueCaptcha().token).not.toBe(issueCaptcha().token);
  });
});

describe('checkCaptcha', () => {
  it('accepts the right answer once, in any case', () => {
    const { token } = issueCaptcha();
    expect(checkCaptcha(token, 'ab3 cd')).toBe('OK');
  });

  it('burns the token on a wrong answer too, so one challenge is not unlimited guesses', () => {
    const { token } = issueCaptcha();
    expect(checkCaptcha(token, 'ZZZZZ')).toBe('WRONG');
    expect(checkCaptcha(token, 'AB3CD')).toBe('SPENT');
  });

  it('refuses an answer of the wrong length without comparing it', () => {
    const { token } = issueCaptcha();
    expect(checkCaptcha(token, 'AB3')).toBe('WRONG');
  });

  it('refuses a replay of a solved token', () => {
    const { token } = issueCaptcha();
    expect(checkCaptcha(token, 'AB3CD')).toBe('OK');
    expect(checkCaptcha(token, 'AB3CD')).toBe('SPENT');
  });

  it.each([
    ['nothing', ''],
    ['not a token', 'hello'],
    ['the wrong version', 'c2.body.sig'],
    ['a missing signature', 'c1.body'],
    ['a missing body', 'c1..sig'],
  ])('rejects %s as invalid', (_label, token) => {
    expect(checkCaptcha(token, 'AB3CD')).toBe('INVALID');
  });

  it('rejects a token with a bad signature, of the right length or not', () => {
    const { token } = issueCaptcha();
    const [version, body, signature] = token.split('.');
    const flipped = `${signature.slice(0, -1)}${signature.endsWith('A') ? 'B' : 'A'}`;
    expect(checkCaptcha(`${version}.${body}.${flipped}`, 'AB3CD')).toBe('INVALID');
    expect(checkCaptcha(`${version}.${body}.short`, 'AB3CD')).toBe('INVALID');
    expect(checkCaptcha(undefined as never, 'AB3CD')).toBe('INVALID');
  });

  it('rejects a correctly signed token whose body is not JSON', () => {
    expect(checkCaptcha(forged('not json'), 'AB3CD')).toBe('INVALID');
  });

  it('expires after ten minutes', () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-01-01T00:00:00Z'));
    const { token } = issueCaptcha();
    jest.setSystemTime(new Date('2026-01-01T00:09:59Z'));
    expect(checkCaptcha(token, 'AB3CD')).toBe('OK');
    const second = issueCaptcha().token;
    jest.setSystemTime(new Date('2026-01-01T00:20:00Z'));
    expect(checkCaptcha(second, 'AB3CD')).toBe('EXPIRED');
  });

  it('forgets spent nonces once they have expired, so the list tracks live tokens only', () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-01-01T00:00:00Z'));
    const first = issueCaptcha().token;
    checkCaptcha(first, 'AB3CD');
    jest.setSystemTime(new Date('2026-01-01T00:11:00Z'));
    const later = issueCaptcha().token;
    expect(checkCaptcha(later, 'AB3CD')).toBe('OK');
    expect(checkCaptcha(first, 'AB3CD')).toBe('EXPIRED');
  });

  it('refuses new challenges rather than forgetting old ones once the spent list is full', () => {
    for (let i = 0; i < 20_000; i += 1) checkCaptcha(issueCaptcha().token, 'AB3CD');
    const { token } = issueCaptcha();
    expect(checkCaptcha(token, 'AB3CD')).toBe('INVALID');
    resetCaptchaState();
    expect(checkCaptcha(token, 'AB3CD')).toBe('OK');
  });

  it('signs with a development secret when none is configured', () => {
    const saved = process.env.JWT_SECRET;
    delete process.env.JWT_SECRET;
    try {
      const { token } = issueCaptcha();
      expect(checkCaptcha(token, 'AB3CD')).toBe('OK');
    } finally {
      process.env.JWT_SECRET = saved;
    }
  });
});

describe('assertCaptcha', () => {
  it('returns quietly for the right answer', () => {
    expect(() => assertCaptcha(issueCaptcha().token, 'AB3CD')).not.toThrow();
  });

  it.each([
    ['not a token', 'zzz', 'AB3CD', 'The verification code could not be checked. Please try a new one.', 'CAPTCHA_INVALID'],
    ['a wrong answer', null, 'ZZZZZ', 'The verification code does not match. Please try again.', 'CAPTCHA_WRONG'],
  ])('throws for %s with a code the client can branch on', (_label, token, answer, message, errorCode) => {
    expect(() => assertCaptcha(token ?? issueCaptcha().token, answer)).toThrow(expect.objectContaining({ message, extensions: { code: errorCode } }));
  });

  it('says expired for both a spent token and an old one', () => {
    const { token } = issueCaptcha();
    assertCaptcha(token, 'AB3CD');
    expect(() => assertCaptcha(token, 'AB3CD')).toThrow(expect.objectContaining({ extensions: { code: 'CAPTCHA_EXPIRED' } }));
    jest.useFakeTimers().setSystemTime(new Date('2026-01-01T00:00:00Z'));
    const old = issueCaptcha().token;
    jest.setSystemTime(new Date('2026-01-01T01:00:00Z'));
    expect(() => assertCaptcha(old, 'AB3CD')).toThrow('The verification code expired. Please try a new one.');
  });
});

describe('requireHuman', () => {
  const anonymous = { user: null } as never;
  const member = { user: { id: 'u1' } } as never;

  it('does not ask a signed-in member to solve anything', () => {
    expect(() => requireHuman(member, {})).not.toThrow();
  });

  it.each([[{}], [{ captcha_token: null }], [{ captcha_token: '   ' }]])('asks an anonymous caller who sent no token (%j)', (input) => {
    expect(() => requireHuman(anonymous, input)).toThrow(
      expect.objectContaining({ message: 'Please complete the verification below.', extensions: { code: 'CAPTCHA_REQUIRED' } })
    );
  });

  it('checks the token and answer an anonymous caller sent, trimming the token', () => {
    const { token } = issueCaptcha();
    expect(() => requireHuman(anonymous, { captcha_token: ` ${token} `, captcha_answer: 'ab3cd' })).not.toThrow();
    const second = issueCaptcha().token;
    expect(() => requireHuman(anonymous, { captcha_token: second })).toThrow(expect.objectContaining({ extensions: { code: 'CAPTCHA_WRONG' } }));
  });
});
