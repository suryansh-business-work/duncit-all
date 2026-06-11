import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import LoginForm from '@/forms/login/login.form';

describe('LoginForm', () => {
  it('renders email + password inputs and the submit button', () => {
    render(<LoginForm onSubmit={() => undefined} />);
    expect(screen.getByLabelText(/Email/i)).toBeTruthy();
    expect(screen.getByLabelText(/^Password$/i)).toBeTruthy();
    expect(screen.getByRole('button', { name: /Sign in/i })).toBeTruthy();
  });

  it('shows a loading label while loading', () => {
    render(<LoginForm onSubmit={() => undefined} loading />);
    expect(screen.getByRole('button', { name: /Signing in/i })).toBeTruthy();
  });

  it('toggles password visibility when the eye icon is pressed', () => {
    render(<LoginForm onSubmit={() => undefined} />);
    const pwd = screen.getByLabelText(/^Password$/i) as HTMLInputElement;
    expect(pwd.type).toBe('password');
    fireEvent.click(screen.getByLabelText(/toggle password visibility/i));
    expect(pwd.type).toBe('text');
  });

  it('calls onSubmit with the form values on submit', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(<LoginForm onSubmit={onSubmit} />);
    fireEvent.change(screen.getByLabelText(/Email/i), { target: { value: 'admin@duncit.com' } });
    fireEvent.change(screen.getByLabelText(/^Password$/i), { target: { value: '12345678' } });
    fireEvent.click(screen.getByRole('button', { name: /Sign in/i }));
    await waitFor(() => expect(onSubmit).toHaveBeenCalled());
    expect(onSubmit.mock.calls[0][0]).toMatchObject({
      email: 'admin@duncit.com',
      password: '12345678',
    });
  });

  it('renders a top-level errorMessage prop', () => {
    render(<LoginForm onSubmit={() => undefined} errorMessage="Boom" />);
    expect(screen.getByText('Boom')).toBeTruthy();
  });

  it('shows a status alert when onSubmit throws', async () => {
    const onSubmit = vi.fn().mockRejectedValue(new Error('Server down'));
    render(<LoginForm onSubmit={onSubmit} />);
    fireEvent.change(screen.getByLabelText(/Email/i), { target: { value: 'admin@duncit.com' } });
    fireEvent.change(screen.getByLabelText(/^Password$/i), { target: { value: '12345678' } });
    fireEvent.click(screen.getByRole('button', { name: /Sign in/i }));
    expect(await screen.findByText('Server down')).toBeTruthy();
  });
});
