import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';

const m = vi.hoisted(() => ({ run: vi.fn(), loading: false }));
vi.mock('@apollo/client', async (io) => {
  const actual = await io<typeof import('@apollo/client')>();
  return { ...actual, useMutation: () => [m.run, { loading: m.loading }] as const };
});

vi.mock('./CreateTemplateForm', () => ({
  default: (p: { onCancel: () => void; onCreate: (i: { slug: string; name: string; subject: string }) => void }) => (
    <div>
      <button type="button" onClick={() => p.onCreate({ slug: 's', name: 'n', subject: 'j' })}>form-create</button>
      <button type="button" onClick={p.onCancel}>form-cancel</button>
    </div>
  ),
}));

import CreateTemplateDialog from './CreateTemplateDialog';
import SendTestDialog from './SendTestDialog';

beforeEach(() => {
  m.run.mockReset();
  m.loading = false;
});

describe('CreateTemplateDialog', () => {
  it('creates a template and reports the new id', async () => {
    const onCreated = vi.fn();
    m.run.mockResolvedValue({ data: { createEmailTemplate: { template_id: 'new-1' } } });
    render(<CreateTemplateDialog open onClose={vi.fn()} onCreated={onCreated} onError={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: 'form-create' }));
    await waitFor(() => expect(onCreated).toHaveBeenCalledWith('new-1'));
  });

  it('falls back to null when the id is missing', async () => {
    const onCreated = vi.fn();
    m.run.mockResolvedValue({ data: {} });
    render(<CreateTemplateDialog open onClose={vi.fn()} onCreated={onCreated} onError={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: 'form-create' }));
    await waitFor(() => expect(onCreated).toHaveBeenCalledWith(null));
  });

  it('reports errors', async () => {
    const onError = vi.fn();
    m.run.mockRejectedValue(new Error('create boom'));
    render(<CreateTemplateDialog open onClose={vi.fn()} onCreated={vi.fn()} onError={onError} />);
    fireEvent.click(screen.getByRole('button', { name: 'form-create' }));
    await waitFor(() => expect(onError).toHaveBeenCalledWith('create boom'));
  });

  it('cancels via the form', () => {
    const onClose = vi.fn();
    render(<CreateTemplateDialog open onClose={onClose} onCreated={vi.fn()} onError={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: 'form-cancel' }));
    expect(onClose).toHaveBeenCalled();
  });
});

const typeEmail = async (value: string) => {
  const input = screen.getByLabelText('To');
  fireEvent.change(input, { target: { value } });
  await waitFor(() => expect((input as HTMLInputElement).value).toBe(value));
};

describe('SendTestDialog', () => {
  it('sends and closes on a successful result', async () => {
    const onResult = vi.fn();
    const onClose = vi.fn();
    m.run.mockResolvedValue({ data: { sendTestEmail: { ok: true, message: 'Delivered' } } });
    render(<SendTestDialog open templateId="t1" varsJson="{}" onClose={onClose} onResult={onResult} />);
    await typeEmail('a@b.co');
    fireEvent.click(screen.getByRole('button', { name: 'Send' }));
    await waitFor(() => expect(onResult).toHaveBeenCalledWith('success', 'Delivered'));
    expect(onClose).toHaveBeenCalled();
  });

  it('uses the default success message when none is returned', async () => {
    const onResult = vi.fn();
    m.run.mockResolvedValue({ data: { sendTestEmail: { ok: true, message: '' } } });
    render(<SendTestDialog open templateId="t1" varsJson="{}" onClose={vi.fn()} onResult={onResult} />);
    await typeEmail('a@b.co');
    fireEvent.click(screen.getByRole('button', { name: 'Send' }));
    await waitFor(() => expect(onResult).toHaveBeenCalledWith('success', 'Sent'));
  });

  it('shows the server failure message inline', async () => {
    const onResult = vi.fn();
    m.run.mockResolvedValue({ data: { sendTestEmail: { ok: false, message: 'Bounced' } } });
    render(<SendTestDialog open templateId="t1" varsJson="{}" onClose={vi.fn()} onResult={onResult} />);
    await typeEmail('a@b.co');
    fireEvent.click(screen.getByRole('button', { name: 'Send' }));
    expect(await screen.findByText('Bounced')).toBeInTheDocument();
    expect(onResult).toHaveBeenCalledWith('error', 'Bounced');
  });

  it('uses the default failure message when the server omits one', async () => {
    const onResult = vi.fn();
    m.run.mockResolvedValue({ data: { sendTestEmail: { ok: false, message: '' } } });
    render(<SendTestDialog open templateId="t1" varsJson="{}" onClose={vi.fn()} onResult={onResult} />);
    await typeEmail('a@b.co');
    fireEvent.click(screen.getByRole('button', { name: 'Send' }));
    await waitFor(() => expect(onResult).toHaveBeenCalledWith('error', 'Failed'));
  });

  it('handles a thrown Error', async () => {
    const onResult = vi.fn();
    m.run.mockRejectedValue(new Error('smtp down'));
    render(<SendTestDialog open templateId="t1" varsJson="{}" onClose={vi.fn()} onResult={onResult} />);
    await typeEmail('a@b.co');
    fireEvent.click(screen.getByRole('button', { name: 'Send' }));
    await waitFor(() => expect(onResult).toHaveBeenCalledWith('error', 'smtp down'));
  });

  it('handles a non-Error rejection with a generic message', async () => {
    const onResult = vi.fn();
    m.run.mockRejectedValue('boom');
    render(<SendTestDialog open templateId="t1" varsJson="{}" onClose={vi.fn()} onResult={onResult} />);
    await typeEmail('a@b.co');
    fireEvent.click(screen.getByRole('button', { name: 'Send' }));
    await waitFor(() => expect(onResult).toHaveBeenCalledWith('error', 'Failed to send test email'));
  });

  it('early-returns from submit when there is no template id', async () => {
    const onResult = vi.fn();
    render(<SendTestDialog open templateId={null} varsJson="{}" onClose={vi.fn()} onResult={onResult} />);
    await typeEmail('a@b.co');
    fireEvent.submit(screen.getByLabelText('To').closest('form')!);
    await new Promise((r) => setTimeout(r, 0));
    expect(m.run).not.toHaveBeenCalled();
    expect(onResult).not.toHaveBeenCalled();
  });

  it('does not send with an invalid email (validation blocks submit)', async () => {
    render(<SendTestDialog open templateId="t1" varsJson="{}" onClose={vi.fn()} onResult={vi.fn()} />);
    await typeEmail('not-an-email');
    fireEvent.click(screen.getByRole('button', { name: 'Send' }));
    await waitFor(() => expect(m.run).not.toHaveBeenCalled());
  });
});
