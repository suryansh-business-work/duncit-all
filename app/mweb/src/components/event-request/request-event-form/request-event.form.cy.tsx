import '@testing-library/jest-dom/vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { RequestEventForm } from '.';
import { EVENT_REQUEST_NOTE_MAX, eventRequestDefaults, makeEventRequestSchema } from './request-event.types';

const t = (key: string, options?: { vars?: Record<string, string | number> }) =>
  `${key}${options?.vars ? JSON.stringify(options.vars) : ''}`;
const schema = makeEventRequestSchema(t);

describe('makeEventRequestSchema', () => {
  it('starts with an empty note, and an empty note is fine — the note is optional', () => {
    expect(eventRequestDefaults).toEqual({ note: '' });
    expect(schema.safeParse(eventRequestDefaults).success).toBe(true);
  });

  it('trims the note it accepts', () => {
    const result = schema.safeParse({ note: '  Saturday evening please  ' });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.note).toBe('Saturday evening please');
  });

  it('accepts a note right at the server’s limit and refuses one past it, naming the limit', () => {
    expect(schema.safeParse({ note: 'x'.repeat(EVENT_REQUEST_NOTE_MAX) }).success).toBe(true);
    const over = schema.safeParse({ note: 'x'.repeat(EVENT_REQUEST_NOTE_MAX + 1) });
    expect(over.success).toBe(false);
    if (!over.success) {
      expect(over.error.issues[0].path).toEqual(['note']);
      expect(over.error.issues[0].message).toBe(`publicPage.eventRequest.noteTooLong{"max":${EVENT_REQUEST_NOTE_MAX}}`);
    }
  });

  it('counts the limit after trimming, so padding never pushes a note over', () => {
    expect(schema.safeParse({ note: `  ${'x'.repeat(EVENT_REQUEST_NOTE_MAX)}  ` }).success).toBe(true);
  });
});

/** The dialog's Send button sits outside the form and targets it by id — the same here. */
function renderForm(onSubmit = vi.fn(() => Promise.resolve())) {
  render(
    <>
      <RequestEventForm formId="request-event-form" onSubmit={onSubmit} />
      <button type="submit" form="request-event-form">
        Send
      </button>
    </>,
  );
  return { onSubmit, send: () => fireEvent.click(screen.getByRole('button', { name: 'Send' })) };
}

const note = () => screen.getByRole('textbox', { name: 'Anything they should know? (optional)' });

describe('RequestEventForm', () => {
  it('offers one optional, labelled note capped at the server’s length', () => {
    renderForm();
    expect(note()).not.toBeRequired();
    expect(note()).toHaveAttribute('maxlength', String(EVENT_REQUEST_NOTE_MAX));
    expect(note()).toHaveAttribute('placeholder', 'A day, a time or the kind of event you would like');
  });

  it('submits an empty note — the request needs nothing more', async () => {
    const { onSubmit, send } = renderForm();
    send();
    await waitFor(() => expect(onSubmit).toHaveBeenCalledWith({ note: '' }));
  });

  it('submits the trimmed note', async () => {
    const { onSubmit, send } = renderForm();
    fireEvent.change(note(), { target: { value: '  A weekend pottery class  ' } });
    send();
    await waitFor(() => expect(onSubmit).toHaveBeenCalledWith({ note: 'A weekend pottery class' }));
  });

  it('holds a note past the limit back with the reason under the field', async () => {
    const { onSubmit, send } = renderForm();
    fireEvent.change(note(), { target: { value: 'x'.repeat(EVENT_REQUEST_NOTE_MAX + 1) } });
    send();
    expect(await screen.findByText(`Keep the note under ${EVENT_REQUEST_NOTE_MAX} characters.`)).toBeInTheDocument();
    expect(note()).toHaveAttribute('aria-invalid', 'true');
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('shows the localized failure as an alert when the send fails, not the raw error', async () => {
    const onSubmit = vi.fn(() => Promise.reject(new Error('socket hang up')));
    const { send } = renderForm(onSubmit);
    send();
    const alert = await screen.findByTestId('request-event-form-error');
    expect(alert).toHaveAttribute('role', 'alert');
    expect(alert).toHaveTextContent("We couldn't send your request. Please try again.");
    expect(alert).not.toHaveTextContent('socket hang up');
  });
});
