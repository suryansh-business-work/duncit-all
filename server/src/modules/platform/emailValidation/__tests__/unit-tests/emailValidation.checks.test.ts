import {
  checksOf,
  EMAIL_CHECK_KEYS,
  statusesOf,
  verdictOf,
  type EmailCheckFlags,
} from '../../emailValidation.checks';

const flags = (over: Partial<EmailCheckFlags> = {}): EmailCheckFlags => ({
  is_valid_syntax: true,
  accepts_mail: true,
  can_connect_smtp: true,
  is_deliverable: true,
  is_catch_all: false,
  has_full_inbox: false,
  is_disabled: false,
  is_disposable: false,
  is_role_account: false,
  ...over,
});

const outcome = (over: Partial<EmailCheckFlags> = {}) =>
  Object.fromEntries(checksOf(flags(over)).map((check) => [check.key, check.passed]));

describe('verdictOf', () => {
  it('reads VERIFIED as VALID and INVALID as INVALID', () => {
    expect(verdictOf('VERIFIED')).toBe('VALID');
    expect(verdictOf('INVALID')).toBe('INVALID');
  });

  it('treats a doubtful and an unconfirmable mailbox alike as RISKY', () => {
    expect(verdictOf('RISKY')).toBe('RISKY');
    expect(verdictOf('UNKNOWN')).toBe('RISKY');
  });
});

describe('statusesOf', () => {
  it('lists the stored statuses each verdict covers', () => {
    expect(statusesOf('VALID')).toEqual(['VERIFIED']);
    expect(statusesOf('RISKY')).toEqual(['RISKY', 'UNKNOWN']);
    expect(statusesOf('INVALID')).toEqual(['INVALID']);
  });

  it('covers nothing for a word that is not a verdict', () => {
    expect(statusesOf('VERIFIED')).toEqual([]);
    expect(statusesOf('constructor')).toEqual([]);
  });
});

describe('checksOf', () => {
  it('returns every test, in reading order', () => {
    expect(checksOf(flags()).map((check) => check.key)).toEqual([...EMAIL_CHECK_KEYS]);
  });

  it('passes every test for a confirmed, ordinary mailbox', () => {
    expect(checksOf(flags()).every((check) => check.passed === true)).toBe(true);
  });

  it('fails the tests whose flag says so', () => {
    expect(
      outcome({ is_catch_all: true, is_disposable: true, is_role_account: true, has_full_inbox: true, is_disabled: true })
    ).toMatchObject({
      NOT_CATCH_ALL: false,
      NOT_DISPOSABLE: false,
      NOT_ROLE_ACCOUNT: false,
      INBOX_HAS_SPACE: false,
      MAILBOX_ENABLED: false,
      MAILBOX_EXISTS: true,
    });
  });

  it('leaves every other test unrun when the address is malformed', () => {
    const result = outcome({ is_valid_syntax: false, accepts_mail: false, can_connect_smtp: false });
    expect(result.SYNTAX).toBe(false);
    for (const key of EMAIL_CHECK_KEYS.filter((k) => k !== 'SYNTAX')) expect(result[key]).toBeNull();
  });

  it('with no mail server, fails that test and leaves the SMTP ones unrun, but still reads the address', () => {
    expect(outcome({ accepts_mail: false, can_connect_smtp: false, is_deliverable: false })).toEqual({
      SYNTAX: true,
      MAIL_SERVER: false,
      SMTP_CONNECTION: null,
      MAILBOX_EXISTS: null,
      MAILBOX_ENABLED: null,
      INBOX_HAS_SPACE: null,
      NOT_CATCH_ALL: null,
      NOT_DISPOSABLE: true,
      NOT_ROLE_ACCOUNT: true,
    });
  });

  it('does not report a mailbox as missing when the server never answered', () => {
    const result = outcome({ can_connect_smtp: false, is_deliverable: false });
    expect(result.SMTP_CONNECTION).toBe(false);
    expect(result.MAILBOX_EXISTS).toBeNull();
    expect(result.MAILBOX_ENABLED).toBeNull();
    expect(result.NOT_CATCH_ALL).toBeNull();
  });
});
