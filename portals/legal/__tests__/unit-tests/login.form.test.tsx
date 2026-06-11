import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { LoginForm } from '../../src/forms/login/index';

const fillValid = () => {
  fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'manager@duncit.com' } });
  fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'secret123' } });
};

describe('LoginForm', () => {
  it('toggles password visibility', () => {
    render(<LoginForm onSubmit={vi.fn()} />);
    const pwd = screen.getByLabelText('Password') as HTMLInputElement;
    expect(pwd.type).toBe('password');
    fireEvent.click(screen.getByLabelText('toggle password visibility'));
    expect(pwd.type).toBe('text');
    fireEvent.click(screen.getByLabelText('toggle password visibility'));
    expect(pwd.type).toBe('password');
  });

  it('submits valid credentials', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(<LoginForm onSubmit={onSubmit} />);
    fillValid();
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));
    await waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith({ email: 'manager@duncit.com', password: 'secret123' })
    );
  });

  it('shows the thrown error message on failure', async () => {
    const onSubmit = vi.fn().mockRejectedValue(new Error('Invalid credentials'));
    render(<LoginForm onSubmit={onSubmit} />);
    fillValid();
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));
    await waitFor(() => expect(screen.getByText('Invalid credentials')).toBeInTheDocument());
  });

  it('falls back to a generic message when the error has none', async () => {
    const onSubmit = vi.fn().mockRejectedValue({});
    render(<LoginForm onSubmit={onSubmit} />);
    fillValid();
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));
    await waitFor(() => expect(screen.getByText(/something went wrong/i)).toBeInTheDocument());
  });

  it('renders an external errorMessage', () => {
    render(<LoginForm onSubmit={vi.fn()} errorMessage="Server down" />);
    expect(screen.getByText('Server down')).toBeInTheDocument();
  });

  it('shows a loading label and disables submit while loading', () => {
    render(<LoginForm onSubmit={vi.fn()} loading submitLabel="Open console" />);
    const button = screen.getByRole('button', { name: /signing in/i });
    expect(button).toBeDisabled();
  });

  it('uses the provided submit label when idle', () => {
    render(<LoginForm onSubmit={vi.fn()} submitLabel="Open console" />);
    expect(screen.getByRole('button', { name: 'Open console' })).toBeInTheDocument();
  });
});
