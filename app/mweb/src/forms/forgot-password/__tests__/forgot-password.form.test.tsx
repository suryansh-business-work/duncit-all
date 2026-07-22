import '@testing-library/jest-dom/vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import ForgotPasswordForm from '../forgot-password.form';

function renderForm(props: Partial<React.ComponentProps<typeof ForgotPasswordForm>> = {}) {
  const onSubmit = props.onSubmit ?? vi.fn();
  const utils = render(<ForgotPasswordForm onSubmit={onSubmit} {...props} />);
  return { onSubmit, ...utils };
}

const emailField = () => screen.getByLabelText(/email/i) as HTMLInputElement;

describe('ForgotPasswordForm — rendering', () => {
  it('renders the email field and submit button', () => {
    renderForm();
    expect(emailField()).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /send reset otp/i })).toBeInTheDocument();
  });

  it('uses initialValues as the field default', () => {
    renderForm({ initialValues: { email: 'preset@duncit.com' } });
    expect(emailField()).toHaveValue('preset@duncit.com');
  });

  it('shows "Sending OTP…" and disables the button while loading', () => {
    renderForm({ loading: true });
    const btn = screen.getByRole('button', { name: /sending otp/i });
    expect(btn).toBeDisabled();
  });

  it('renders the emailError below the field', () => {
    renderForm({ emailError: 'Unregistered User' });
    expect(screen.getByRole('alert')).toHaveTextContent('Unregistered User');
  });

  it('renders the errorMessage prop in an error alert', () => {
    renderForm({ errorMessage: 'Server exploded' });
    expect(screen.getByRole('alert')).toHaveTextContent('Server exploded');
  });
});

describe('ForgotPasswordForm — validation', () => {
  it('blocks submit and shows required error when empty', async () => {
    const onSubmit = vi.fn();
    renderForm({ onSubmit });
    fireEvent.click(screen.getByRole('button', { name: /send reset otp/i }));
    expect(await screen.findByText(/Email is required/i)).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('blocks submit and shows invalid-email error for a malformed email', async () => {
    const onSubmit = vi.fn();
    renderForm({ onSubmit });
    fireEvent.change(emailField(), { target: { value: 'not-an-email' } });
    fireEvent.click(screen.getByRole('button', { name: /send reset otp/i }));
    expect(await screen.findByText(/Enter a valid email/i)).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });
});

describe('ForgotPasswordForm — submission', () => {
  it('calls onSubmit with the trimmed email when valid', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    renderForm({ onSubmit });
    fireEvent.change(emailField(), { target: { value: '  hello@duncit.com  ' } });
    fireEvent.click(screen.getByRole('button', { name: /send reset otp/i }));
    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit.mock.calls[0][0]).toEqual({ email: 'hello@duncit.com' });
  });

  it('surfaces the thrown Error message in an alert', async () => {
    const onSubmit = vi.fn().mockRejectedValue(new Error('Network down'));
    renderForm({ onSubmit });
    fireEvent.change(emailField(), { target: { value: 'hello@duncit.com' } });
    fireEvent.click(screen.getByRole('button', { name: /send reset otp/i }));
    expect(await screen.findByText('Network down')).toBeInTheDocument();
  });

  it('falls back to a generic message when a non-Error is thrown', async () => {
    const onSubmit = vi.fn().mockRejectedValue('boom');
    renderForm({ onSubmit });
    fireEvent.change(emailField(), { target: { value: 'hello@duncit.com' } });
    fireEvent.click(screen.getByRole('button', { name: /send reset otp/i }));
    expect(await screen.findByText('Something went wrong')).toBeInTheDocument();
  });
});
