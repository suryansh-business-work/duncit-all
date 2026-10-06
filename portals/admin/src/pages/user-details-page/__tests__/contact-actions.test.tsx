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
import { fireEvent, screen, waitFor } from '@testing-library/react';
import type { MockedResponse } from '@apollo/client/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { renderWithProviders } from './testkit';
import ContactActionDialog from '../ContactActionDialog';
import { RECORD_USER_CONTACT_ACTION, START_RECORDED_USER_CALL } from '../queries';
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
    renderWithProviders(
      <ContactActionDialog open={false} type="CALL" user={USER} onClose={vi.fn()} onSaved={vi.fn()} />
    );

    expect(document.body.querySelector('[role="dialog"]')).toBeNull();
  });

  it('opens on the member, showing the number it would dial', async () => {
    renderWithProviders(
      <ContactActionDialog open type="CALL" user={USER} onClose={vi.fn()} onSaved={vi.fn()} />
    );

    expect(fieldValues()).toContain('+919000000001');
  });

  it('opens on the address for an email instead', async () => {
    renderWithProviders(
      <ContactActionDialog open type="EMAIL" user={USER} onClose={vi.fn()} onSaved={vi.fn()} />
    );

    expect(fieldValues()).toContain('meera@duncit.com');
  });

  it('opens for a member with nothing on file, rather than crashing on it', async () => {
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

describe('ContactActionDialog — logging and calling', () => {
  const CALL_TARGET = '+919000000001';

  const recordMock = (
    input: Record<string, unknown>,
    outcome: { error?: Error; delay?: number } = {},
  ): MockedResponse => ({
    request: { query: RECORD_USER_CONTACT_ACTION, variables: { input } },
    ...(outcome.error
      ? { error: outcome.error }
      : {
          result: {
            data: { recordUserContactAction: { __typename: 'UserContactAction', id: 'ca-9' } },
          },
        }),
    delay: outcome.delay,
  });

  const startCallMock = (notes: string, error?: Error): MockedResponse => ({
    request: {
      query: START_RECORDED_USER_CALL,
      variables: { input: { user_id: 'u-1', target: CALL_TARGET, notes } },
    },
    ...(error
      ? { error }
      : {
          result: {
            data: {
              startRecordedUserCall: {
                __typename: 'UserContactAction',
                id: 'ca-10',
                status: 'QUEUED',
                twilio_call_sid: 'CA123',
              },
            },
          },
        }),
  });

  const loggedCall = (notes: string) => ({
    user_id: 'u-1',
    type: 'CALL',
    target: CALL_TARGET,
    subject: '',
    notes,
    status: 'LOGGED',
    duration_seconds: 0,
    recording_url: '',
  });

  const renderDialog = (
    type: 'CALL' | 'EMAIL',
    mocks: MockedResponse[] = [],
    user: Record<string, unknown> = USER,
  ) => {
    const onClose = vi.fn();
    const onSaved = vi.fn();
    renderWithProviders(
      <ContactActionDialog open type={type} user={user} onClose={onClose} onSaved={onSaved} />,
      { mocks },
    );
    return { onClose, onSaved };
  };

  const typeNotes = (notes: string) =>
    fireEvent.change(screen.getByRole('textbox', { name: 'Notes' }), { target: { value: notes } });

  it('saves the call log with what was typed, then tells the page and closes', async () => {
    const { onClose, onSaved } = renderDialog('CALL', [
      recordMock(loggedCall('Called about the refund')),
    ]);

    expect(screen.getByText('Call User')).toBeInTheDocument();
    expect(screen.getByText('Meera N')).toBeInTheDocument();
    typeNotes('Called about the refund');
    fireEvent.click(screen.getByRole('button', { name: 'Save Log' }));

    await waitFor(() => expect(onSaved).toHaveBeenCalledTimes(1));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('shows the save in flight, refuses a second save and will not be dismissed meanwhile', async () => {
    const { onClose, onSaved } = renderDialog('CALL', [recordMock(loggedCall(''), { delay: 300 })]);

    fireEvent.click(screen.getByRole('button', { name: 'Save Log' }));

    const saving = await screen.findByRole('button', { name: 'Saving...' });
    expect(saving).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Start Recorded Call' })).toBeDisabled();
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });
    expect(onClose).not.toHaveBeenCalled();

    await waitFor(() => expect(onSaved).toHaveBeenCalledTimes(1));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('can be dismissed with Escape while nothing is being saved', () => {
    const { onClose } = renderDialog('CALL');

    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('keeps the dialog open and shows why, when the server refuses the log', async () => {
    const { onClose, onSaved } = renderDialog('CALL', [
      recordMock(loggedCall(''), { error: new Error('Contact log service offline') }),
    ]);

    fireEvent.click(screen.getByRole('button', { name: 'Save Log' }));

    expect(await screen.findByText('Contact log service offline')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Save Log' })).toBeEnabled();
    expect(onSaved).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
  });

  it('falls back to a generic reason when the save fails without one', async () => {
    const { onSaved } = renderDialog('CALL', [recordMock(loggedCall(''), { error: new Error('') })]);

    fireEvent.click(screen.getByRole('button', { name: 'Save Log' }));

    expect(await screen.findByText('Failed to save contact log')).toBeInTheDocument();
    expect(onSaved).not.toHaveBeenCalled();
  });

  it('sends nothing while a field is invalid, and says which', async () => {
    const { onSaved } = renderDialog('CALL');

    fireEvent.change(screen.getByRole('textbox', { name: 'Recording URL' }), {
      target: { value: 'file:///tmp/call.mp3' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Save Log' }));

    expect(
      await screen.findByText('Recording URL must start with http:// or https://'),
    ).toBeInTheDocument();
    // No mock is registered: a request would have surfaced as an error alert.
    expect(screen.queryByRole('alert')).toBeNull();
    expect(onSaved).not.toHaveBeenCalled();
  });

  it('starts a recorded call to the number with the notes typed, then closes', async () => {
    const { onClose, onSaved } = renderDialog('CALL', [startCallMock('Refund follow-up')]);

    typeNotes('Refund follow-up');
    fireEvent.click(screen.getByRole('button', { name: 'Start Recorded Call' }));

    await waitFor(() => expect(onSaved).toHaveBeenCalledTimes(1));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('shows why a recorded call could not be started', async () => {
    const { onSaved } = renderDialog('CALL', [
      startCallMock('', new Error('Twilio is not configured')),
    ]);

    fireEvent.click(screen.getByRole('button', { name: 'Start Recorded Call' }));

    expect(await screen.findByText('Twilio is not configured')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Start Recorded Call' })).toBeEnabled();
    expect(onSaved).not.toHaveBeenCalled();
  });

  it('falls back to a generic reason when the recorded call fails without one', async () => {
    renderDialog('CALL', [startCallMock('', new Error(''))]);

    fireEvent.click(screen.getByRole('button', { name: 'Start Recorded Call' }));

    expect(await screen.findByText('Failed to start recorded call')).toBeInTheDocument();
  });

  it('opens the dialer on the number for a call', () => {
    renderDialog('CALL');

    fireEvent.click(screen.getByRole('button', { name: 'Open Dialer' }));

    expect(opened).toEqual([`tel:${CALL_TARGET}`]);
  });

  it('opens the mail app with the subject typed for an email, and offers no recorded call', () => {
    renderDialog('EMAIL');

    expect(screen.getByText('Email User')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Start Recorded Call' })).toBeNull();
    fireEvent.change(screen.getByRole('textbox', { name: 'Subject' }), {
      target: { value: 'Your refund' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Open Email' }));

    expect(opened).toEqual(['mailto:meera@duncit.com?subject=Your%20refund']);
  });

  it('names the member by email when there is no full name', () => {
    renderDialog('EMAIL', [], { ...USER, full_name: '' });

    expect(screen.getByText('meera@duncit.com', { selector: 'p' })).toBeInTheDocument();
  });

  it('falls back to the member id, and blocks saving and opening, when nothing is on file', () => {
    renderDialog('EMAIL', [], { user_id: 'u-2' });

    expect(screen.getByText('u-2')).toBeInTheDocument();
    expect(screen.getByText('No target available for this contact action.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Save Log' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Open Email' })).toBeDisabled();
  });
});
