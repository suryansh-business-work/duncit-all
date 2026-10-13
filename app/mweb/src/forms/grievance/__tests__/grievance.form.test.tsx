import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router';

import GrievanceForm from '../grievance.form';
import type { GrievanceValues } from '../grievance.types';
import { fallbackT } from '../../../i18n/fallback';

const tickets = [
  { value: 'ST-AAA111', label: 'ST-AAA111 · Refund not received' },
  { value: 'ST-BBB222', label: 'ST-BBB222 · Pod cancelled' },
];

const account: GrievanceValues = {
  name: 'Riya Sharma',
  email: 'riya@example.test',
  phone: '+919000000001',
  address: '',
  support_ticket_ref: '',
  subject: '',
  description: '',
};

function renderForm(over: Partial<Parameters<typeof GrievanceForm>[0]> = {}) {
  const onSubmit = vi.fn().mockResolvedValue(undefined);
  render(
    <MemoryRouter>
      <GrievanceForm tickets={tickets} onSubmit={onSubmit} {...over} />
    </MemoryRouter>,
  );
  return { onSubmit };
}

const input = (name: string) =>
  within(screen.getByTestId(name)).getByRole('textbox') as HTMLInputElement | HTMLTextAreaElement;
const type = (name: string, value: string) => fireEvent.change(input(name), { target: { value } });
const submit = () => fireEvent.click(screen.getByTestId('grievance-form-submit'));

async function pickTicket(label: string) {
  fireEvent.mouseDown(within(screen.getByTestId('support_ticket_ref')).getByRole('combobox'));
  fireEvent.click(await screen.findByRole('option', { name: label }));
}

describe('GrievanceForm', () => {
  it('blocks an empty submit with a message per required field', async () => {
    const { onSubmit } = renderForm();
    submit();
    expect(await screen.findAllByText(/required|is required/i)).not.toHaveLength(0);
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('refuses a malformed email and phone', async () => {
    const { onSubmit } = renderForm({ prefill: { ...account, email: '', phone: '' } });
    type('email', 'not-an-email');
    type('phone', '12ab');
    await pickTicket(tickets[0]!.label);
    type('subject', 'Refund');
    type('description', 'I was charged twice');
    submit();
    expect(await screen.findByText(fallbackT('grievance.errorEmail'))).toBeInTheDocument();
    expect(screen.getByText(fallbackT('grievance.errorPhone'))).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('submits trimmed values with the chosen ticket, the account details prefilled and read-only', async () => {
    const { onSubmit } = renderForm({ prefill: account });
    await waitFor(() => expect(input('name')).toHaveValue('Riya Sharma'));
    expect(input('name')).toHaveAttribute('readonly');
    // The one the account left blank stays typeable.
    expect(input('address')).not.toHaveAttribute('readonly');

    await pickTicket(tickets[1]!.label);
    type('subject', '  Pod cancelled late  ');
    type('description', ' Host cancelled an hour before ');
    submit();
    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit.mock.calls[0]?.[0]).toMatchObject({
      name: 'Riya Sharma',
      email: 'riya@example.test',
      support_ticket_ref: 'ST-BBB222',
      subject: 'Pod cancelled late',
      description: 'Host cancelled an hour before',
    });
  });

  it('shows the failure and keeps what was typed when the desk refuses it', async () => {
    const onSubmit = vi.fn().mockRejectedValue(new Error('The grievance desk is closed'));
    render(
      <MemoryRouter>
        <GrievanceForm tickets={tickets} prefill={account} onSubmit={onSubmit} />
      </MemoryRouter>,
    );
    await waitFor(() => expect(input('name')).toHaveValue('Riya Sharma'));
    await pickTicket(tickets[0]!.label);
    type('subject', 'Refund');
    type('description', 'Not received');
    submit();
    expect(await screen.findByTestId('grievance-form-error')).toHaveTextContent('grievance desk is closed');
    expect(input('subject')).toHaveValue('Refund');
  });

  it('replaces the ticket picker with the way to raise one when there are no tickets, and shuts submit', () => {
    renderForm({ tickets: [] });
    expect(screen.getByTestId('support-ticket-field-empty')).toBeInTheDocument();
    expect(screen.getByTestId('support-ticket-field-create')).toHaveAttribute('href', '/support/tickets');
    expect(screen.getByTestId('grievance-form-submit')).toBeDisabled();
  });

  it('keeps the picker, not the empty notice, while tickets are still loading', () => {
    renderForm({ tickets: [], ticketsLoading: true });
    expect(screen.queryByTestId('support-ticket-field-empty')).not.toBeInTheDocument();
    expect(screen.getByTestId('support_ticket_ref')).toBeInTheDocument();
    expect(screen.getByTestId('grievance-form-submit')).toBeEnabled();
  });

  it('shows the submitting label and shuts the button while sending', () => {
    renderForm({ loading: true });
    expect(screen.getByTestId('grievance-form-submit')).toBeDisabled();
    expect(screen.getByTestId('grievance-form-submit')).toHaveTextContent(fallbackT('grievance.submitting'));
  });
});
