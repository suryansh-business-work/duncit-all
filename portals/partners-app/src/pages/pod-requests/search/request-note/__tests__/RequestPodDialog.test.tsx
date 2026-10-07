import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, configure, fireEvent, screen, waitFor } from '@testing-library/react';
import RequestPodDialog from '..';
import { renderWithProviders } from '../../../../../__tests__/render';

configure({ asyncUtilTimeout: 5000 });
afterEach(cleanup);

const mount = (over: { open?: boolean; sending?: boolean; error?: string | null } = {}) => {
  const onSend = vi.fn();
  const onCancel = vi.fn();
  renderWithProviders(
    <RequestPodDialog
      open={over.open ?? true}
      targetName="Kiran Shah"
      sending={over.sending ?? false}
      error={over.error ?? null}
      onSend={onSend}
      onCancel={onCancel}
    />,
  );
  return { onSend, onCancel };
};

const noteField = () => screen.getByLabelText('Note (optional)');
const sendButton = () => screen.getByRole('button', { name: 'Request Pod' }) as HTMLButtonElement;

describe('RequestPodDialog', () => {
  it('renders nothing while closed', () => {
    mount({ open: false });
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('names who is being asked and sends an empty note when none is written', async () => {
    const { onSend } = mount();

    expect(screen.getByRole('dialog', { name: 'Request Pod · Kiran Shah' })).toBeTruthy();
    fireEvent.click(sendButton());

    await waitFor(() => expect(onSend).toHaveBeenCalledTimes(1));
    expect(onSend.mock.calls[0][0]).toEqual({ note: '' });
  });

  it('sends the note trimmed', async () => {
    const { onSend } = mount();

    fireEvent.change(noteField(), { target: { value: '  Weekend league?  ' } });
    fireEvent.click(sendButton());

    await waitFor(() => expect(onSend).toHaveBeenCalledTimes(1));
    expect(onSend.mock.calls[0][0]).toEqual({ note: 'Weekend league?' });
  });

  it('accepts a note of exactly 500 characters', async () => {
    const { onSend } = mount();

    fireEvent.change(noteField(), { target: { value: 'a'.repeat(500) } });
    fireEvent.click(sendButton());

    await waitFor(() => expect(onSend).toHaveBeenCalledTimes(1));
  });

  it('refuses a note over 500 characters and does not send', async () => {
    const { onSend } = mount();

    fireEvent.change(noteField(), { target: { value: 'a'.repeat(501) } });
    fireEvent.click(sendButton());

    expect(await screen.findByText('Keep the note under 500 characters.')).toBeTruthy();
    expect(onSend).not.toHaveBeenCalled();
    expect(noteField().getAttribute('maxlength')).toBe('500');
  });

  it("shows the server's refusal inside the dialog", () => {
    mount({ error: 'You have used all your Pod Requests for this month.' });

    expect(screen.getByRole('alert').textContent).toContain('You have used all your Pod Requests for this month.');
  });

  it('cancels from the Cancel button', () => {
    const { onCancel } = mount();

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('locks both buttons while sending and ignores Escape', () => {
    const { onCancel } = mount({ sending: true });

    expect(sendButton().disabled).toBe(true);
    expect((screen.getByRole('button', { name: 'Cancel' }) as HTMLButtonElement).disabled).toBe(true);
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });
    expect(onCancel).not.toHaveBeenCalled();
  });

  it('closes on Escape when idle', () => {
    const { onCancel } = mount();

    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });
    expect(onCancel).toHaveBeenCalledTimes(1);
  });
});
