import { fallbackT } from '@/i18n/fallback';
import { makeNoteSchema, noteToHtml, NOTE_BODY_MAX } from '@/forms/note';
import { dueAt, makeReminderSchema } from '@/forms/reminder';
import { makeTwoFactorSchema } from '@/forms/two-factor';
import { makeLoginSchema } from '@/forms/login';

/** The rules each form refuses by — the same messages a person reads. */

const messages = (result: { success: boolean; error?: { issues: Array<{ message: string }> } }) =>
  result.success ? [] : (result.error?.issues ?? []).map((i) => i.message);

describe('sign-in (the shared console rules)', () => {
  const schema = makeLoginSchema(fallbackT, 'EMAIL');

  it('accepts an address and an 8+ character password', () => {
    expect(schema.safeParse({ email: 'asha@duncit.com', password: 'longenough' }).success).toBe(true);
  });

  it('refuses a missing or malformed address and a short password', () => {
    expect(schema.safeParse({ email: '', password: 'longenough' }).success).toBe(false);
    expect(schema.safeParse({ email: 'not-an-email', password: 'longenough' }).success).toBe(false);
    expect(schema.safeParse({ email: 'asha@duncit.com', password: 'short' }).success).toBe(false);
  });
});

describe('two-step code', () => {
  const schema = makeTwoFactorSchema(fallbackT);

  it('accepts six digits, trimmed', () => {
    expect(schema.safeParse({ code: ' 123456 ' })).toMatchObject({ success: true, data: { code: '123456' } });
  });

  it.each(['12345', '1234567', 'abcdef', ''])('refuses %p with the code message', (code) => {
    expect(messages(schema.safeParse({ code }))).toEqual(['Enter the 6-digit code']);
  });
});

describe('note', () => {
  const schema = makeNoteSchema(fallbackT);

  it('needs the note itself; the summary is optional', () => {
    expect(schema.safeParse({ summary: '', body: 'Wants Sunday slots' }).success).toBe(true);
    expect(messages(schema.safeParse({ summary: 'x', body: '   ' }))).toEqual(['Write the note']);
  });

  it('caps the note length', () => {
    expect(messages(schema.safeParse({ summary: '', body: 'x'.repeat(NOTE_BODY_MAX + 1) }))).toEqual([
      `Keep it under ${NOTE_BODY_MAX} characters`,
    ]);
  });

  it('stores typed text as escaped paragraphs, so it can never inject markup into the portal', () => {
    expect(noteToHtml('Hi <b>team</b> & "all"\nline two')).toBe('<p>Hi &lt;b&gt;team&lt;/b&gt; &amp; &quot;all&quot;</p><p>line two</p>');
  });
});

describe('reminder', () => {
  const schema = makeReminderSchema(fallbackT);

  it('needs a title and a due choice', () => {
    expect(schema.safeParse({ title: 'Call back', due: 'tomorrow', notes: '' }).success).toBe(true);
    expect(messages(schema.safeParse({ title: ' ', due: 'tomorrow', notes: '' }))).toEqual(['Give the reminder a title']);
    expect(messages(schema.safeParse({ title: 'x', due: 'someday', notes: '' }))).toEqual(['Pick when it is due']);
  });

  it('works out each due choice from now', () => {
    const now = new Date('2026-11-24T10:00:00.000Z');
    expect(dueAt('hour', now).toISOString()).toBe('2026-11-24T11:00:00.000Z');
    expect(dueAt('threeHours', now).toISOString()).toBe('2026-11-24T13:00:00.000Z');
    expect(dueAt('tomorrow', now).toISOString()).toBe('2026-11-25T10:00:00.000Z');
    expect(dueAt('threeDays', now).toISOString()).toBe('2026-11-27T10:00:00.000Z');
    expect(dueAt('week', now).toISOString()).toBe('2026-12-01T10:00:00.000Z');
  });
});
