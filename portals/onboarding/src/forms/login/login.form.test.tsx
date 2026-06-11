import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import LoginForm from './login.form';

describe('LoginForm component', () => {
  it('renders fields, default submit label and toggles password visibility', () => {
    render(<LoginForm onSubmit={vi.fn()} />);
    expect(screen.getByRole('button', { name: 'Sign in' })).toBeInTheDocument();
    const password = screen.getByLabelText('Password');
    expect(password).toHaveAttribute('type', 'password');
    fireEvent.click(screen.getByLabelText('toggle password visibility'));
    expect(password).toHaveAttribute('type', 'text');
    fireEvent.click(screen.getByLabelText('toggle password visibility'));
    expect(password).toHaveAttribute('type', 'password');
  });

  it('renders the loading state and a custom submit label', () => {
    render(<LoginForm onSubmit={vi.fn()} loading submitLabel="Continue" />);
    const button = screen.getByRole('button', { name: 'Signing in…' });
    expect(button).toBeDisabled();
  });

  it('renders an external error message', () => {
    render(<LoginForm onSubmit={vi.fn()} errorMessage="Bad credentials" />);
    expect(screen.getByText('Bad credentials')).toBeInTheDocument();
  });

  it('submits valid values', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(<LoginForm onSubmit={onSubmit} initialValues={{ email: 'a@b.com', password: 'secret123' }} />);
    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));
    await waitFor(() => expect(onSubmit).toHaveBeenCalledWith({ email: 'a@b.com', password: 'secret123' }));
  });

  it('surfaces a thrown submit error as a status alert', async () => {
    const onSubmit = vi.fn().mockRejectedValue(new Error('Server exploded'));
    render(<LoginForm onSubmit={onSubmit} initialValues={{ email: 'a@b.com', password: 'secret123' }} />);
    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));
    expect(await screen.findByText('Server exploded')).toBeInTheDocument();
  });

  it('falls back to a generic status when the error has no message', async () => {
    const onSubmit = vi.fn().mockRejectedValue({});
    render(<LoginForm onSubmit={onSubmit} initialValues={{ email: 'a@b.com', password: 'secret123' }} />);
    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));
    expect(await screen.findByText('Something went wrong')).toBeInTheDocument();
  });
});
