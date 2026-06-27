import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { LoginForm } from './index';

describe('LoginForm (RHF + Zod)', () => {
  it('renders both fields, the hints and the default submit label', () => {
    render(<LoginForm onSubmit={vi.fn()} />);
    expect(screen.getByLabelText('Email')).toBeInTheDocument();
    expect(screen.getByLabelText('Password')).toBeInTheDocument();
    expect(screen.getByText('Use your Duncit account email.')).toBeInTheDocument();
    expect(screen.getByText('At least 8 characters.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Sign in' })).toBeInTheDocument();
  });

  it('honours a custom submit label and a passed errorMessage', () => {
    render(<LoginForm onSubmit={vi.fn()} submitLabel="Log in" errorMessage="Bad creds" />);
    expect(screen.getByRole('button', { name: 'Log in' })).toBeInTheDocument();
    expect(screen.getByText('Bad creds')).toBeInTheDocument();
  });

  it('shows the loading state and disables the button', () => {
    render(<LoginForm onSubmit={vi.fn()} loading />);
    const button = screen.getByRole('button', { name: 'Signing in…' });
    expect(button).toBeDisabled();
  });

  it('toggles password visibility', () => {
    render(<LoginForm onSubmit={vi.fn()} />);
    const password = screen.getByLabelText('Password') as HTMLInputElement;
    expect(password.type).toBe('password');
    fireEvent.click(screen.getByLabelText('toggle password visibility'));
    expect(password.type).toBe('text');
  });

  it('blocks submit and surfaces validation messages for invalid input', async () => {
    const onSubmit = vi.fn();
    render(<LoginForm onSubmit={onSubmit} />);
    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));
    expect(await screen.findByText(/required/i)).toBeInTheDocument();
    expect(await screen.findByText(/at least 8 characters/i)).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('submits the normalised values when valid', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(<LoginForm onSubmit={onSubmit} initialValues={{ email: '', password: '' }} />);
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'Manager@Duncit.com' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'secret123' } });
    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));
    await waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith({ email: 'manager@duncit.com', password: 'secret123' }),
    );
  });

  it('renders the submit error when onSubmit throws', async () => {
    const onSubmit = vi.fn().mockRejectedValue(new Error('Server exploded'));
    render(<LoginForm onSubmit={onSubmit} />);
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'manager@duncit.com' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'secret123' } });
    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));
    expect(await screen.findByText('Server exploded')).toBeInTheDocument();
  });

  it('falls back to a generic message for a non-Error throw', async () => {
    const onSubmit = vi.fn().mockRejectedValue('boom');
    render(<LoginForm onSubmit={onSubmit} />);
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'manager@duncit.com' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'secret123' } });
    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));
    expect(await screen.findByText('Something went wrong')).toBeInTheDocument();
  });
});
