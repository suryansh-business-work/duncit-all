import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { EmailValidationResultData } from '../src/email-validation/queries';

const h = vi.hoisted(() => ({ validate: vi.fn(), warn: vi.fn() }));

vi.mock('@apollo/client/react', () => ({ useMutation: () => [h.validate] }));
vi.mock('@duncit/app-settings', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@duncit/app-settings')>()),
  useDateFormat: () => ({ formatDateTime: (value: string) => `on ${value}` }),
}));
vi.mock('@duncit/logs', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@duncit/logs')>()),
  createLogger: () => ({ debug: vi.fn(), info: vi.fn(), warn: h.warn, error: vi.fn() }),
}));

const { EmailValidationDialog } = await import('../src/email-validation/EmailValidationDialog');
const { EmailValidationProvider } = await import('../src/email-validation/EmailValidationProvider');
const { EmailCell } = await import('../../table/src/cells/emailCell');

const result = (email: string, verdict: EmailValidationResultData['verdict'] = 'VALID'): EmailValidationResultData => ({
  id: `id-${email}`,
  email,
  verdict,
  portal: 'finance',
  suggestion: '',
  created_at: '2026-11-21T10:00:00.000Z',
  checks: [{ key: 'SYNTAX', passed: true }],
});

/** A promise this test settles by hand. */
function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((r) => {
    resolve = r;
  });
  return { promise, resolve };
}

beforeEach(() => {
  h.validate.mockReset();
  h.warn.mockReset();
});

describe('EmailValidationDialog', () => {
  it('stays closed and asks nothing without an address', () => {
    render(<EmailValidationDialog email={null} portal="finance" onClose={vi.fn()} />);
    expect(screen.queryByTestId('email-validation-dialog')).not.toBeInTheDocument();
    expect(h.validate).not.toHaveBeenCalled();
  });

  it('lists the tests while it checks, then shows the result, logged against this console', async () => {
    const answer = deferred<{ data: { validateEmail: EmailValidationResultData } }>();
    h.validate.mockReturnValue(answer.promise);

    render(<EmailValidationDialog email="asha@example.com" portal="finance" onClose={vi.fn()} />);

    expect(h.validate).toHaveBeenCalledWith({ variables: { email: 'asha@example.com', portal: 'finance' } });
    expect(screen.getByTestId('email-validation-address')).toHaveTextContent('asha@example.com');
    expect(screen.getByRole('list', { name: 'Checks' })).toHaveAttribute('aria-busy', 'true');
    expect(screen.getByTestId('email-validation-again')).toBeDisabled();

    await act(async () => answer.resolve({ data: { validateEmail: result('asha@example.com') } }));

    expect(screen.getByTestId('email-verdict-valid')).toBeInTheDocument();
    expect(screen.getByTestId('email-validation-again')).toHaveTextContent('Validate again');
    expect(screen.getByTestId('email-validation-again')).toBeEnabled();
  });

  it('shows why a check failed, logs it without the address, and tries again on request', async () => {
    h.validate.mockRejectedValueOnce(new Error('Email verifier answered 502'));
    render(<EmailValidationDialog email="asha@example.com" portal="finance" onClose={vi.fn()} />);

    expect(await screen.findByTestId('email-validation-error')).toHaveTextContent(
      'Could not validate this email. Email verifier answered 502'
    );
    expect(h.warn).toHaveBeenCalledWith('emailValidation', 'validate', expect.objectContaining({ portal: 'finance' }));
    expect(JSON.stringify(h.warn.mock.calls[0][2])).not.toContain('asha@example.com');

    h.validate.mockResolvedValueOnce({ data: { validateEmail: result('asha@example.com', 'INVALID') } });
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));

    expect(await screen.findByTestId('email-verdict-invalid')).toBeInTheDocument();
    expect(screen.queryByTestId('email-validation-error')).not.toBeInTheDocument();
  });

  it('treats an empty answer as a failure, and a non-Error rejection with the plain message', async () => {
    h.validate.mockResolvedValueOnce({ data: null });
    const { rerender } = render(<EmailValidationDialog email="a@example.com" portal="crm" onClose={vi.fn()} />);
    expect(await screen.findByTestId('email-validation-error')).toHaveTextContent('Could not validate this email.');

    h.validate.mockRejectedValueOnce('boom');
    rerender(<EmailValidationDialog email="b@example.com" portal="crm" onClose={vi.fn()} />);
    await waitFor(() => expect(h.validate).toHaveBeenCalledTimes(2));
    expect(await screen.findByTestId('email-validation-error')).toHaveTextContent(/^Could not validate this email\.\s*$/);
  });

  it('drops an answer that arrives after the dialog moved on to another address', async () => {
    const first = deferred<{ data: { validateEmail: EmailValidationResultData } }>();
    h.validate.mockReturnValueOnce(first.promise).mockResolvedValueOnce({ data: { validateEmail: result('b@example.com') } });
    const { rerender } = render(<EmailValidationDialog email="a@example.com" portal="crm" onClose={vi.fn()} />);

    rerender(<EmailValidationDialog email="b@example.com" portal="crm" onClose={vi.fn()} />);
    expect(await screen.findByTestId('email-verdict-valid')).toBeInTheDocument();

    await act(async () => first.resolve({ data: { validateEmail: result('a@example.com', 'INVALID') } }));
    expect(screen.queryByTestId('email-verdict-invalid')).not.toBeInTheDocument();
    expect(screen.getByTestId('email-validation-address')).toHaveTextContent('b@example.com');
  });

  it('drops a failure that arrives after the dialog closed', async () => {
    let fail!: (reason: unknown) => void;
    h.validate.mockReturnValueOnce(new Promise((_r, reject) => (fail = reject)));
    const { rerender } = render(<EmailValidationDialog email="a@example.com" portal="crm" onClose={vi.fn()} />);
    rerender(<EmailValidationDialog email={null} portal="crm" onClose={vi.fn()} />);

    await act(async () => fail(new Error('late')));
    expect(h.warn).not.toHaveBeenCalled();
  });

  it('closes on request', () => {
    h.validate.mockReturnValue(new Promise(() => undefined));
    const onClose = vi.fn();
    render(<EmailValidationDialog email="a@example.com" portal="crm" onClose={onClose} />);
    fireEvent.click(screen.getByTestId('email-validation-close'));
    expect(onClose).toHaveBeenCalled();
  });
});

describe('EmailValidationProvider', () => {
  it('puts a Validate button in every grid email cell, which opens the dialog for that address', async () => {
    h.validate.mockResolvedValue({ data: { validateEmail: result('asha@example.com') } });
    render(
      <EmailValidationProvider enabled portal="support">
        <EmailCell value="asha@example.com" />
      </EmailValidationProvider>
    );

    fireEvent.click(screen.getByRole('button', { name: 'Validate asha@example.com' }));

    expect(await screen.findByTestId('email-validation-dialog')).toBeInTheDocument();
    expect(h.validate).toHaveBeenCalledWith({ variables: { email: 'asha@example.com', portal: 'support' } });
    fireEvent.click(screen.getByTestId('email-validation-close'));
    await waitFor(() => expect(screen.queryByTestId('email-validation-dialog')).not.toBeInTheDocument());
  });

  it('offers nothing when off, or with no portal to log against', () => {
    const { rerender } = render(
      <EmailValidationProvider enabled={false} portal="support">
        <EmailCell value="asha@example.com" />
      </EmailValidationProvider>
    );
    expect(screen.queryByRole('button')).not.toBeInTheDocument();

    rerender(
      <EmailValidationProvider enabled portal="">
        <EmailCell value="asha@example.com" />
      </EmailValidationProvider>
    );
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
    expect(screen.getByText('asha@example.com')).toBeInTheDocument();
  });
});
