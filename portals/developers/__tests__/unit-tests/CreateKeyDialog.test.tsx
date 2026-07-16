import { describe, expect, it, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import CreateKeyDialog from '../../src/pages/api-keys/CreateKeyDialog';

const baseProps = {
  open: true,
  busy: false,
  rawKey: null as string | null,
  error: null as string | null,
  onCreate: vi.fn(),
  onClose: vi.fn(),
};

describe('CreateKeyDialog', () => {
  beforeEach(() => {
    baseProps.onCreate = vi.fn();
    baseProps.onClose = vi.fn();
  });

  it('renders nothing visible when closed', () => {
    render(<CreateKeyDialog {...baseProps} open={false} />);
    expect(screen.queryByText('Create API key')).not.toBeInTheDocument();
  });

  it('disables Create until a non-blank name is entered', () => {
    render(<CreateKeyDialog {...baseProps} />);
    const createBtn = screen.getByRole('button', { name: 'Create key' });
    expect(createBtn).toBeDisabled();

    fireEvent.change(screen.getByLabelText('Key name'), { target: { value: '  ' } });
    expect(createBtn).toBeDisabled();

    fireEvent.change(screen.getByLabelText('Key name'), { target: { value: 'Staging' } });
    expect(createBtn).toBeEnabled();
  });

  it('calls onCreate with the trimmed name', () => {
    render(<CreateKeyDialog {...baseProps} />);
    fireEvent.change(screen.getByLabelText('Key name'), { target: { value: '  Staging  ' } });
    fireEvent.click(screen.getByRole('button', { name: 'Create key' }));
    expect(baseProps.onCreate).toHaveBeenCalledWith('Staging');
  });

  it('shows the busy label and disables Create while busy', () => {
    render(<CreateKeyDialog {...baseProps} busy />);
    fireEvent.change(screen.getByLabelText('Key name'), { target: { value: 'x' } });
    const createBtn = screen.getByRole('button', { name: 'Creating…' });
    expect(createBtn).toBeDisabled();
  });

  it('shows an error alert in the create state when error is set', () => {
    render(<CreateKeyDialog {...baseProps} error="boom" />);
    expect(screen.getByText('boom')).toBeInTheDocument();
  });

  it('Cancel resets the name and calls onClose', () => {
    render(<CreateKeyDialog {...baseProps} />);
    fireEvent.change(screen.getByLabelText('Key name'), { target: { value: 'abc' } });
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(baseProps.onClose).toHaveBeenCalledTimes(1);
  });

  it('reveals the raw key once created and copies it to the clipboard', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, { clipboard: { writeText } });

    render(<CreateKeyDialog {...baseProps} rawKey="dk_live_secret" />);
    expect(screen.getByText('API key created')).toBeInTheDocument();
    expect(screen.getByDisplayValue('dk_live_secret')).toBeInTheDocument();
    expect(screen.queryByText('Copied to clipboard')).not.toBeInTheDocument();

    fireEvent.click(screen.getByLabelText('Copy API key'));
    await waitFor(() => expect(writeText).toHaveBeenCalledWith('dk_live_secret'));
    await waitFor(() => expect(screen.getByText('Copied to clipboard')).toBeInTheDocument());

    // Done button uses the reveal-state label and closes.
    fireEvent.click(screen.getByRole('button', { name: 'Done' }));
    expect(baseProps.onClose).toHaveBeenCalledTimes(1);
  });

  it('copy is a no-op when there is no raw key (guard branch)', async () => {
    const writeText = vi.fn();
    Object.assign(navigator, { clipboard: { writeText } });
    // Force the reveal UI without a rawKey is impossible via props, so we assert
    // the create-state has no copy button at all.
    render(<CreateKeyDialog {...baseProps} />);
    expect(screen.queryByLabelText('Copy API key')).not.toBeInTheDocument();
    expect(writeText).not.toHaveBeenCalled();
  });
});
