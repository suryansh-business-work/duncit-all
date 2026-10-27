import { describe, expect, it } from 'vitest';
import { DEFAULT_TEMPLATES } from '../../services/email.templates';

/** Every template key the server sends by name (auth, registrations, notifications). */
const SENT_BY_THE_SERVER = [
  'sign_in_code',
  'registration_confirmed',
  'registration_pending',
  'registration_payment_pending',
  'registration_waitlisted',
  'registration_declined',
  'event_reminder',
  'event_update',
  'event_cancelled',
  'host_new_registration',
  'calendar_new_event',
  'cohost_added',
];

const placeholders = (text: string) => [...text.matchAll(/\{(\w+)\}/g)].map((match) => match[1]);

describe('DEFAULT_TEMPLATES', () => {
  it('seeds exactly the templates the server sends, each key once', () => {
    const keys = DEFAULT_TEMPLATES.map((t) => t.key);
    expect(new Set(keys).size).toBe(keys.length);
    expect([...keys].sort()).toEqual([...SENT_BY_THE_SERVER].sort());
  });

  it.each(DEFAULT_TEMPLATES.map((t) => [t.key, t] as const))('%s declares every placeholder its subject and body use', (_key, template) => {
    const used = new Set([...placeholders(template.subject), ...placeholders(template.body)]);
    for (const name of used) expect(template.vars).toContain(name);
  });

  it('gives the console a name, description, subject and body for each', () => {
    for (const template of DEFAULT_TEMPLATES) {
      expect(template.name.trim()).not.toBe('');
      expect(template.description.trim()).not.toBe('');
      expect(template.subject.trim()).not.toBe('');
      expect(template.body.trim()).not.toBe('');
    }
  });

  it('puts the check-in code in the confirmation and reminder emails', () => {
    for (const key of ['registration_confirmed', 'event_reminder']) {
      const template = DEFAULT_TEMPLATES.find((t) => t.key === key);
      expect(template?.body).toContain('{code}');
      expect(template?.body).toContain('{ticket_url}');
    }
  });
});
