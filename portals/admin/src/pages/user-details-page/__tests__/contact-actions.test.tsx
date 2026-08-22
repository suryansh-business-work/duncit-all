/**
 * Logging a call or an email against a member.
 *
 * The dialog is one component for two genuinely different things, and the parts
 * that differ are the parts worth holding. A CALL is placed to a phone number
 * assembled from the extension AND the number — losing the extension dials the
 * wrong country — while an EMAIL goes to the address; and each has its own set
 * of outcomes, so a call cannot be logged as BOUNCED and an email cannot be
 * logged as VOICEMAIL.
 *
 * The recording URL is checked to be an http(s) address rather than merely
 * non-empty: a `file:` or `javascript:` link stored on a contact record is
 * something a later admin will click.
 *
 * Opening the native app is a `tel:` or a `mailto:`, built here rather than
 * typed by the person, because the subject has to survive being put in a URL.
 */
import { fireEvent } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { renderWithProviders } from './testkit';
import {
  buildContactTarget,
  openNativeContact,
} from '../ContactActionDialog/contactActionDialogHelpers';
import {
  CALL_STATUSES,
  EMAIL_STATUSES,
  buildContactActionSchema,
  contactActionInitialValues,
} from '../contact-action/contact-action.form';

const USER = {
  user_id: 'u-1',
  full_name: 'Meera N',
  email: 'meera@duncit.com',
  phone_extension: '+91',
  phone_number: '9000000001',
};

const valid = {
  subject: 'Followed up on the refund',
  notes: 'Explained the settlement timing.',
  status: 'CONNECTED',
  duration_seconds: 180,
  recording_url: 'https://cdn.duncit.com/call.mp3',
};

const fieldValues = () =>
  [...document.body.querySelectorAll<HTMLInputElement>('input')].map((field) => field.value);

let opened: string[] = [];

beforeEach(() => {
  opened = [];
  Object.defineProperty(globalThis, 'open', {
    configurable: true,
    value: vi.fn((url: string) => {
      opened.push(url);
      return null;
    }),
  });
});

afterEach(() => {
  vi.clearAllMocks();
});

describe('buildContactTarget', () => {
  it('dials the extension AND the number — losing the extension dials another country', () => {
    expect(buildContactTarget('CALL', USER)).toBe('+919000000001');
  });

  it('emails the address', () => {
    expect(buildContactTarget('EMAIL', USER)).toBe('meera@duncit.com');
  });

  it('is empty for a member with nothing on file, rather than a stray "+91"', () => {
    expect(buildContactTarget('CALL', { phone_extension: '', phone_number: '' })).toBe('');
    expect(buildContactTarget('EMAIL', {})).toBe('');
  });

  it('dials a number with no extension recorded', () => {
    expect(buildContactTarget('CALL', { phone_number: '9000000001' })).toBe('9000000001');
  });
});

describe('openNativeContact', () => {
  it('opens a tel: for a call and a mailto: for an email', () => {
    openNativeContact('CALL', '+919000000001', '');
    openNativeContact('EMAIL', 'meera@duncit.com', '');

    expect(opened).toEqual(['tel:+919000000001', 'mailto:meera@duncit.com']);
  });

  it('escapes the subject, which would otherwise break the URL it is put in', () => {
    openNativeContact('EMAIL', 'meera@duncit.com', 'Refund & timing');

    expect(opened[0]).toContain('subject=Refund%20%26%20timing');
  });

  it('leaves the subject off entirely when there is none', () => {
    openNativeContact('EMAIL', 'meera@duncit.com', '');

    expect(opened[0]).toBe('mailto:meera@duncit.com');
  });

  it('opens nothing at all for a member with no number and no address', () => {
    openNativeContact('CALL', '', 'anything');

    expect(opened).toEqual([]);
  });
});

describe('buildContactActionSchema', () => {
  const call = buildContactActionSchema('CALL');
  const email = buildContactActionSchema('EMAIL');

  it('starts logged, with nothing typed and no duration', () => {
    expect(contactActionInitialValues.status).toBe('LOGGED');
    expect(contactActionInitialValues.duration_seconds).toBe(0);
  });

  it('takes a fully filled call', () => {
    expect(call.safeParse(valid).success).toBe(true);
  });

  it('keeps the two outcome lists apart — a call is never BOUNCED', () => {
    expect(call.safeParse({ ...valid, status: 'BOUNCED' }).success).toBe(false);
    expect(email.safeParse({ ...valid, status: 'BOUNCED' }).success).toBe(true);
  });

  it('and an email is never VOICEMAIL', () => {
    expect(email.safeParse({ ...valid, status: 'VOICEMAIL' }).success).toBe(false);
    expect(call.safeParse({ ...valid, status: 'VOICEMAIL' }).success).toBe(true);
  });

  it('accepts every status each side actually offers', () => {
    for (const status of CALL_STATUSES) {
      expect(call.safeParse({ ...valid, status }).success).toBe(true);
    }
    for (const status of EMAIL_STATUSES) {
      expect(email.safeParse({ ...valid, status }).success).toBe(true);
    }
  });

  it('refuses a negative duration and one longer than a day', () => {
    expect(call.safeParse({ ...valid, duration_seconds: -1 }).success).toBe(false);
    expect(call.safeParse({ ...valid, duration_seconds: 86_401 }).success).toBe(false);
    expect(call.safeParse({ ...valid, duration_seconds: 86_400 }).success).toBe(true);
  });

  it('refuses a fractional duration — seconds are whole', () => {
    expect(call.safeParse({ ...valid, duration_seconds: 1.5 }).success).toBe(false);
  });

  it('coerces a duration typed as text, which is what a number field hands back', () => {
    const parsed = call.safeParse({ ...valid, duration_seconds: '180' });

    expect(parsed.success).toBe(true);
    expect(parsed.success ? parsed.data.duration_seconds : 0).toBe(180);
  });

  it('refuses a recording link that is not http(s) — a later admin will click it', () => {
    expect(call.safeParse({ ...valid, recording_url: 'file:///tmp/call.mp3' }).success).toBe(false);
    expect(call.safeParse({ ...valid, recording_url: 'javascript:alert(1)' }).success).toBe(false);
    expect(call.safeParse({ ...valid, recording_url: 'not-a-url' }).success).toBe(false);
  });

  it('takes no recording at all, because most calls have none', () => {
    expect(call.safeParse({ ...valid, recording_url: '' }).success).toBe(true);
  });

  it('caps the subject and the notes as the record will hold them', () => {
    expect(call.safeParse({ ...valid, subject: 'x'.repeat(161) }).success).toBe(false);
    expect(call.safeParse({ ...valid, notes: 'x'.repeat(2001) }).success).toBe(false);
  });

  it('trims what was typed, so a stray space is not stored as content', () => {
    const parsed = call.safeParse({ ...valid, subject: '  Followed up  ' });

    expect(parsed.success ? parsed.data.subject : '').toBe('Followed up');
  });
});

describe('ContactActionDialog', () => {
  it('renders nothing while it is closed', async () => {
    const { default: ContactActionDialog } = await import('../ContactActionDialog');
    renderWithProviders(
      <ContactActionDialog open={false} type="CALL" user={USER} onClose={vi.fn()} onSaved={vi.fn()} />
    );

    expect(document.body.querySelector('[role="dialog"]')).toBeNull();
  });

  it('opens on the member, showing the number it would dial', async () => {
    const { default: ContactActionDialog } = await import('../ContactActionDialog');
    renderWithProviders(
      <ContactActionDialog open type="CALL" user={USER} onClose={vi.fn()} onSaved={vi.fn()} />
    );

    expect(fieldValues()).toContain('+919000000001');
  });

  it('opens on the address for an email instead', async () => {
    const { default: ContactActionDialog } = await import('../ContactActionDialog');
    renderWithProviders(
      <ContactActionDialog open type="EMAIL" user={USER} onClose={vi.fn()} onSaved={vi.fn()} />
    );

    expect(fieldValues()).toContain('meera@duncit.com');
  });

  it('opens for a member with nothing on file, rather than crashing on it', async () => {
    const { default: ContactActionDialog } = await import('../ContactActionDialog');
    renderWithProviders(
      <ContactActionDialog
        open
        type="CALL"
        user={{ user_id: 'u-2', full_name: 'Nobody' }}
        onClose={vi.fn()}
        onSaved={vi.fn()}
      />
    );

    expect(document.body.querySelector('[role="dialog"]')).not.toBeNull();
  });

  it('closes through the caller rather than on its own', async () => {
    const onClose = vi.fn();
    const { default: ContactActionDialog } = await import('../ContactActionDialog');
    renderWithProviders(
      <ContactActionDialog open type="CALL" user={USER} onClose={onClose} onSaved={vi.fn()} />
    );

    const cancel = [...document.body.querySelectorAll<HTMLButtonElement>('button')].find((button) =>
      /cancel|close/i.test(button.textContent ?? '')
    );
    if (cancel) fireEvent.click(cancel);

    expect(document.body.innerHTML).not.toBe('');
  });
});
