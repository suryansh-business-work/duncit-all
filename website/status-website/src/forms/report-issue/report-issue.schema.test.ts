/**
 * What the report form refuses before it costs a round trip.
 *
 * The server re-validates every one of these, so nothing here is the security
 * boundary — what it buys is that a visitor who is already having a bad day
 * hears about a typo immediately rather than after a request that may itself
 * be the thing that is broken.
 */
import { describe, expect, it } from 'vitest';
import { buildReportSchema } from './report-issue.schema';
import { MESSAGE_MAX, NAME_MAX, REPORT_DEFAULTS, URL_MAX } from './report-issue.types';

/** The translator the schema is built from, echoing the key it was asked for. */
const t = ((key: string) => key) as Parameters<typeof buildReportSchema>[0];
const schema = buildReportSchema(t);

const VALID = {
  ...REPORT_DEFAULTS,
  name: 'Meera N',
  email: 'meera@duncit.com',
  message: 'The sign-in page returns a 500 every time I try.',
  captcha_answer: '7',
};

/** The message on one field, or undefined when the schema accepted it. */
const messageFor = (input: unknown, field: string): string | undefined => {
  const result = schema.safeParse(input);
  if (result.success) return undefined;
  return result.error.issues.find((issue) => issue.path[0] === field)?.message;
};

describe('buildReportSchema', () => {
  it('accepts a filled-in report, trimming what was typed', () => {
    const parsed = schema.parse({ ...VALID, name: '  Meera N  ', page_url: '' });

    expect(parsed).toMatchObject({
      name: 'Meera N',
      impact: 'CANNOT_ACCESS',
      // Empty is "not sure", which the server keeps as-is rather than guessing.
      service_key: '',
      page_url: '',
    });
  });

  it('asks for a name and an address it can reply to', () => {
    expect(messageFor({ ...VALID, name: '   ' }, 'name')).toBe('status.report.nameRequired');
    expect(messageFor({ ...VALID, name: 'n'.repeat(NAME_MAX + 1) }, 'name')).toBe(
      'status.report.nameLong',
    );
    expect(messageFor({ ...VALID, email: '' }, 'email')).toBe('status.report.emailRequired');
    expect(messageFor({ ...VALID, email: 'meera@' }, 'email')).toBe('status.report.emailInvalid');
  });

  it('wants enough of a description to act on', () => {
    expect(messageFor({ ...VALID, message: '' }, 'message')).toBe(
      'status.report.messageRequired',
    );
    // Long enough to be a sentence, because "broken" is not a report.
    expect(messageFor({ ...VALID, message: 'broken' }, 'message')).toBe(
      'status.report.messageShort',
    );
    expect(messageFor({ ...VALID, message: 'm'.repeat(MESSAGE_MAX + 1) }, 'message')).toBe(
      'status.report.messageLong',
    );
  });

  /**
   * The page address is optional — a visitor who cannot reach the site at all
   * has none to give — but a value that is there has to be one somebody can
   * open.
   */
  it('takes a web address or nothing, and nothing else', () => {
    expect(schema.safeParse({ ...VALID, page_url: '' }).success).toBe(true);
    expect(schema.safeParse({ ...VALID, page_url: 'https://duncit.com/login' }).success).toBe(true);
    expect(schema.safeParse({ ...VALID, page_url: 'http://duncit.com' }).success).toBe(true);

    expect(messageFor({ ...VALID, page_url: 'duncit.com/login' }, 'page_url')).toBe(
      'status.report.urlInvalid',
    );
    // A URL that parses but is not something a browser opens.
    expect(messageFor({ ...VALID, page_url: 'javascript:alert(1)' }, 'page_url')).toBe(
      'status.report.urlInvalid',
    );
    expect(
      messageFor({ ...VALID, page_url: `https://duncit.com/${'x'.repeat(URL_MAX)}` }, 'page_url'),
    ).toBe('status.report.urlInvalid');
  });

  it('asks that the human check was answered, without judging the answer', () => {
    // Whether it is the RIGHT answer is the server's to say — this half only
    // catches an empty box.
    expect(messageFor({ ...VALID, captcha_answer: '  ' }, 'captcha_answer')).toBe(
      'captcha.required',
    );
    expect(schema.safeParse({ ...VALID, captcha_answer: 'wrong' }).success).toBe(true);
  });

  it('refuses an impact that is not one of the six offered', () => {
    expect(schema.safeParse({ ...VALID, impact: 'ANNOYING' }).success).toBe(false);
    expect(schema.safeParse({ ...VALID, impact: 'PAYMENT' }).success).toBe(true);
  });
});
