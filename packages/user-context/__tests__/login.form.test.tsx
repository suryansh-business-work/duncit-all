import { describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import LoginForm, { loginSchema } from '../src/login-screen/login.form';

describe('loginSchema', () => {
  it('accepts a valid email + password', async () => {
    await expect(loginSchema.validate({ email: 'a@b.co', password: 'pw' })).resolves.toBeTruthy();
  });

  it('rejects a missing email', async () => {
    await expect(loginSchema.validate({ email: '', password: 'pw' })).rejects.toThrow(/E-mail address is required/);
  });

  it('rejects an invalid email', async () => {
    await expect(loginSchema.validate({ email: 'nope', password: 'pw' })).rejects.toThrow(/valid e-mail/i);
  });

  it('rejects a missing password', async () => {
    await expect(loginSchema.validate({ email: 'a@b.co', password: '' })).rejects.toThrow(/Password is required/);
  });
});

describe('LoginForm', () => {
  it('shows validation errors when submitting empty', async () => {
    const onSubmit = vi.fn();
    render(<LoginForm onSubmit={onSubmit} onForgotPassword={vi.fn()} />);
    await userEvent.click(screen.getByLabelText('sign in'));
    expect(await screen.findByText('E-mail address is required')).toBeInTheDocument();
    expect(await screen.findByText('Password is required')).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('submits valid values', async () => {
    const onSubmit = vi.fn();
    render(<LoginForm onSubmit={onSubmit} onForgotPassword={vi.fn()} />);
    await userEvent.type(screen.getByPlaceholderText('e-mail address'), 'a@b.co');
    await userEvent.type(screen.getByPlaceholderText('password'), 'secret');
    await userEvent.click(screen.getByLabelText('sign in'));
    await waitFor(() => expect(onSubmit).toHaveBeenCalledWith({ email: 'a@b.co', password: 'secret' }));
  });

  it('toggles password visibility', async () => {
    render(<LoginForm onSubmit={vi.fn()} onForgotPassword={vi.fn()} />);
    const pwd = screen.getByPlaceholderText('password') as HTMLInputElement;
    expect(pwd.type).toBe('password');
    await userEvent.click(screen.getByLabelText('toggle password visibility'));
    expect(pwd.type).toBe('text');
    await userEvent.click(screen.getByLabelText('toggle password visibility'));
    expect(pwd.type).toBe('password');
  });

  it('invokes the forgot-password handler', async () => {
    const onForgot = vi.fn();
    render(<LoginForm onSubmit={vi.fn()} onForgotPassword={onForgot} />);
    await userEvent.click(screen.getByText('Forgot password?'));
    expect(onForgot).toHaveBeenCalled();
  });

  it('disables the submit button while loading', () => {
    render(<LoginForm loading onSubmit={vi.fn()} onForgotPassword={vi.fn()} />);
    expect(screen.getByLabelText('sign in')).toBeDisabled();
  });
});
