import { describe, expect, it } from 'vitest';
import {
  emailAiRequestDefaults,
  emailTemplateCreateDefaults,
  emailTestSendDefaults,
  makeEmailAiRequestSchema,
  makeEmailTemplateCreateSchema,
  makeEmailTestSendSchema,
  toEmailTemplateCreateInput,
} from '../src/schemas/email-template';

/** A new CRM email template, a test send and an AI request: the key is echoed, so each message is named. */
const echo = (key: string) => key;
const PICK = 'crm.emailTemplates.pickATypeAndFillName';

const issues = (input: unknown) => {
  const result = makeEmailTemplateCreateSchema(echo).safeParse(input);
  return result.success ? [] : result.error.issues.map((issue) => `${issue.path.join('.')}:${issue.message}`);
};
const filled = { target: 'VENUE', name: 'Diwali Offer', slug: '', subject: 'Festive rates' } as const;

describe('makeEmailTemplateCreateSchema', () => {
  it('accepts a template with an audience, a name and a subject, trimming them', () => {
    const result = makeEmailTemplateCreateSchema(echo).safeParse({ ...filled, name: '  Diwali Offer ' });
    expect(result.success && result.data.name).toBe('Diwali Offer');
  });

  it('asks for the audience, the name and the subject with one sentence', () => {
    expect(issues(emailTemplateCreateDefaults)).toEqual(
      expect.arrayContaining([`target:${PICK}`, `name:${PICK}`, `subject:${PICK}`]),
    );
    expect(issues({ ...filled, subject: '   ' })).toEqual([`subject:${PICK}`]);
  });

  it('refuses a name that yields no slug unless a slug is typed', () => {
    expect(issues({ ...filled, name: '***' })).toEqual([`slug:${PICK}`]);
    expect(issues({ ...filled, name: '***', slug: 'promo' })).toEqual([]);
  });
});

describe('toEmailTemplateCreateInput', () => {
  it('derives the slug from the name when none is typed, and trims the text', () => {
    expect(
      toEmailTemplateCreateInput({ ...filled, name: ' Diwali Offer 2026 ', subject: ' Hi ' }, '<mjml/>'),
    ).toEqual({
      slug: 'diwali-offer-2026',
      name: 'Diwali Offer 2026',
      subject: 'Hi',
      target: 'VENUE',
      mjml: '<mjml/>',
    });
  });

  it('keeps a typed slug, and sends no audience when none was picked', () => {
    expect(
      toEmailTemplateCreateInput({ target: '', name: 'Footer', slug: ' static-footer ', subject: 'Footer' }, 'm'),
    ).toMatchObject({ slug: 'static-footer', target: null });
  });
});

describe('makeEmailTestSendSchema', () => {
  const check = (to: string) => makeEmailTestSendSchema(echo).safeParse({ to });

  it('takes one valid address, trimmed', () => {
    const result = check(' qa@duncit.com ');
    expect(result.success && result.data.to).toBe('qa@duncit.com');
  });

  it.each([emailTestSendDefaults.to, 'qa@duncit', 'qa duncit.com'])('refuses "%s"', (to) => {
    const result = check(to);
    expect(result.success ? [] : result.error.issues.map((i) => i.message)).toEqual([
      'crm.emailTemplates.enterValidEmail',
    ]);
  });
});

describe('makeEmailAiRequestSchema', () => {
  it('needs something to write', () => {
    const schema = makeEmailAiRequestSchema(echo);
    expect(schema.safeParse({ prompt: 'A Diwali offer' }).success).toBe(true);
    const blank = schema.safeParse({ ...emailAiRequestDefaults, prompt: '  ' });
    expect(blank.success ? [] : blank.error.issues.map((i) => i.message)).toEqual(['crm.emailSettings.promptRequired']);
  });
});
