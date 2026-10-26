import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, screen, waitFor } from '@testing-library/react';
import SupportForm from './support.form';
import { renderWithProviders } from '../../__tests__/render';

afterEach(cleanup);

const valid = { name: 'Asha Rao', email: 'asha@duncit.com' };

const fill = () => {
  fireEvent.change(screen.getByLabelText(/Subject/), { target: { value: 'Payout is late' } });
  fireEvent.change(screen.getByLabelText(/^Message/), { target: { value: 'My last payout has not arrived yet.' } });
};
const send = () => fireEvent.click(screen.getByRole('button', { name: 'Send to support' }));

describe('SupportForm', () => {
  it('hands the validated values to onSubmit', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    renderWithProviders(<SupportForm initialValues={valid} onSubmit={onSubmit} />);
    fill();
    send();
    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit.mock.calls[0][0]).toEqual({
      ...valid,
      category: 'HOST',
      subject: 'Payout is late',
      message: 'My last payout has not arrived yet.',
    });
  });

  it('shows what onSubmit rejected with when the caller passes no message of its own', async () => {
    renderWithProviders(<SupportForm initialValues={valid} onSubmit={() => Promise.reject(new Error('Desk is closed'))} />);
    fill();
    send();
    expect(await screen.findByText('Desk is closed')).toBeTruthy();
  });

  it('says the request could not be submitted when the rejection carries nothing readable', async () => {
    renderWithProviders(<SupportForm initialValues={valid} onSubmit={() => Promise.reject(new Error(''))} />);
    fill();
    send();
    expect(await screen.findByText('Could not submit support request.')).toBeTruthy();
  });

  it('prefers the caller’s own error message and shows the sending state while it loads', () => {
    renderWithProviders(<SupportForm initialValues={valid} loading errorMessage="Try later" onSubmit={vi.fn()} />);
    expect(screen.getByText('Try later')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Sending...' })).toBeTruthy();
  });

  it('names the problem under a subject that is too short and does not submit', async () => {
    const onSubmit = vi.fn();
    renderWithProviders(<SupportForm initialValues={valid} onSubmit={onSubmit} />);
    fireEvent.change(screen.getByLabelText(/Subject/), { target: { value: 'Hi' } });
    fireEvent.change(screen.getByLabelText(/^Message/), { target: { value: 'My last payout has not arrived yet.' } });
    send();
    expect(await screen.findByText(/at least 3/i)).toBeTruthy();
    expect(onSubmit).not.toHaveBeenCalled();
  });
});
