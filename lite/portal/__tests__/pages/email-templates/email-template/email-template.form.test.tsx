import { describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { LiteEmailTemplate } from '../../../../graphql/email';
import { EmailTemplateForm, type EmailTemplateValues } from '../../../../pages/email-templates/email-template';
import { makeTemplate } from '../../../fixtures';

type Submit = (values: EmailTemplateValues) => Promise<void>;

const form = (template: LiteEmailTemplate | null, onSubmit: Submit = vi.fn<Submit>(() => Promise.resolve()), busy = false) => (
  <EmailTemplateForm template={template} busy={busy} onClose={vi.fn()} onSubmit={onSubmit} />
);

const body = (): HTMLTextAreaElement => {
  const element = screen.getByTestId('template-body');
  if (!(element instanceof HTMLTextAreaElement)) throw new Error('body is not a textarea');
  return element;
};

describe('EmailTemplateForm', () => {
  it('is closed until a template is picked, then shows it under its name', () => {
    const { rerender } = render(form(null));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    rerender(form(makeTemplate()));
    expect(screen.getByRole('dialog', { name: 'Edit Registration confirmed' })).toBeInTheDocument();
    expect(screen.getByTestId('template-subject')).toHaveValue('You are going to {event_title}');
    expect(body()).toHaveValue('Hi {guest_name}, see you there.');
    expect(screen.getByLabelText('Enabled')).toBeChecked();
  });

  it('replaces the selected text with the picked placeholder and puts the cursor after it', async () => {
    const user = userEvent.setup();
    render(form(makeTemplate()));
    body().setSelectionRange(3, 15);
    await user.click(screen.getByRole('button', { name: 'Insert {event_title}' }));
    expect(body()).toHaveValue('Hi {event_title}, see you there.');
    await waitFor(() => expect(body()).toHaveFocus());
    expect(body().selectionStart).toBe(16);
    expect(body().selectionEnd).toBe(16);
  });

  it('inserts at the cursor without replacing anything when nothing is selected', async () => {
    const user = userEvent.setup();
    render(form(makeTemplate()));
    const end = 'Hi {guest_name}, see you there.'.length;
    body().setSelectionRange(end, end);
    await user.click(screen.getByRole('button', { name: 'Insert {guest_name}' }));
    expect(body()).toHaveValue('Hi {guest_name}, see you there.{guest_name}');
  });

  it('saves the edited subject, body and switch', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn<Submit>(() => Promise.resolve());
    render(form(makeTemplate(), onSubmit));
    const subject = screen.getByTestId('template-subject');
    await user.clear(subject);
    await user.type(subject, 'See you at {{event_title}');
    await user.click(screen.getByLabelText('Enabled'));
    await user.click(screen.getByTestId('email-template-dialog-submit'));
    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit.mock.calls[0]?.[0]).toEqual({ subject: 'See you at {event_title}', body: 'Hi {guest_name}, see you there.', enabled: false });
  });

  it('requires a subject and a body', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn<Submit>(() => Promise.resolve());
    render(form(makeTemplate(), onSubmit));
    await user.clear(screen.getByTestId('template-subject'));
    await user.clear(body());
    await user.click(screen.getByTestId('email-template-dialog-submit'));
    expect(await screen.findByText('Subject is required')).toBeInTheDocument();
    expect(screen.getByText('Body is required')).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('shows no placeholder chips for a template without any, and locks everything while saving', () => {
    render(form(makeTemplate({ vars: [] }), undefined, true));
    expect(screen.queryByText(/Select one to insert it/)).not.toBeInTheDocument();
    expect(screen.getByTestId('template-subject')).toBeDisabled();
    expect(body()).toBeDisabled();
    expect(screen.getByTestId('template-enabled')).toBeDisabled();
  });
});
