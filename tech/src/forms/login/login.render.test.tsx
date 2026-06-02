import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import LoginForm from './login.form';

const fill = () => {
  fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'a@b.com' } });
  fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'password1' } });
};

describe('LoginForm', () => {
  it('toggles password visibility', () => {
    render(<LoginForm onSubmit={vi.fn()} />);
    const pwd = screen.getByLabelText('Password') as HTMLInputElement;
    expect(pwd.type).toBe('password');
    fireEvent.click(screen.getByRole('button', { name: /toggle password visibility/i }));
    expect(pwd.type).toBe('text');
  });

  it('shows a loading label and disables submit while loading', () => {
    render(<LoginForm loading onSubmit={vi.fn()} />);
    expect(screen.getByRole('button', { name: 'Signing in…' })).toBeDisabled();
  });

  it('surfaces the errorMessage prop', () => {
    render(<LoginForm errorMessage="Bad credentials" onSubmit={vi.fn()} />);
    expect(screen.getByText('Bad credentials')).toBeInTheDocument();
  });

  it('submits valid values and uses a custom label', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(<LoginForm submitLabel="Continue" onSubmit={onSubmit} />);
    fill();
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
    await waitFor(() => expect(onSubmit).toHaveBeenCalledWith({ email: 'a@b.com', password: 'password1' }));
  });

  it('shows the thrown error message as form status', async () => {
    const onSubmit = vi.fn().mockRejectedValue(new Error('Server down'));
    render(<LoginForm onSubmit={onSubmit} />);
    fill();
    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));
    await waitFor(() => expect(screen.getByText('Server down')).toBeInTheDocument());
  });

  it('falls back to a generic status when the error has no message', async () => {
    const onSubmit = vi.fn().mockRejectedValue({});
    render(<LoginForm onSubmit={onSubmit} />);
    fill();
    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));
    await waitFor(() => expect(screen.getByText('Something went wrong')).toBeInTheDocument());
  });
});
