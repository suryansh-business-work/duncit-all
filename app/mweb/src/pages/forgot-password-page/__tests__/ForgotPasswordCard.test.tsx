import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MockedProvider } from '@apollo/client/testing';
import { MemoryRouter } from 'react-router-dom';
import ForgotPasswordCard from '../ForgotPasswordCard';

function renderCard(props: Partial<React.ComponentProps<typeof ForgotPasswordCard>> = {}) {
  const onSubmit = props.onSubmit ?? vi.fn().mockResolvedValue(undefined);
  const utils = render(
    <MockedProvider mocks={[]} addTypename={false}>
      <MemoryRouter>
        <ForgotPasswordCard
          loading={props.loading ?? false}
          errorMessage={props.errorMessage ?? null}
          unregistered={props.unregistered ?? false}
          onSubmit={onSubmit}
        />
      </MemoryRouter>
    </MockedProvider>,
  );
  return { ...utils, onSubmit };
}

describe('ForgotPasswordCard', () => {
  it('renders the heading, description and email form', () => {
    renderCard();
    expect(screen.getByText('password?')).toBeInTheDocument();
    expect(
      screen.getByText(/Enter your email and we’ll send you a 6-digit OTP/i),
    ).toBeInTheDocument();
    expect(screen.getByLabelText(/Email/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Send reset OTP/i })).toBeInTheDocument();
  });

  it('shows the "Back to login" footer when the email is registered', () => {
    renderCard({ unregistered: false });
    expect(screen.getByText('Remembered it?')).toBeInTheDocument();
    const back = screen.getByRole('link', { name: /Back to login/i });
    expect(back).toHaveAttribute('href', '/login');
    expect(screen.queryByRole('link', { name: /Create Account/i })).toBeNull();
  });

  it('swaps the footer to a Create Account CTA and flags the field when unregistered', () => {
    renderCard({ unregistered: true });
    expect(screen.getByText('New to Duncit?')).toBeInTheDocument();
    const cta = screen.getByRole('link', { name: /Create Account/i });
    expect(cta).toHaveAttribute('href', '/register');
    // emailError flows into the form as an alert.
    expect(screen.getByText('Unregistered User')).toBeInTheDocument();
    expect(screen.queryByText('Remembered it?')).toBeNull();
  });

  it('reflects the loading state on the submit button', () => {
    renderCard({ loading: true });
    const btn = screen.getByRole('button', { name: /Sending OTP/i });
    expect(btn).toBeDisabled();
  });

  it('surfaces the server error message', () => {
    renderCard({ errorMessage: 'Server exploded' });
    expect(screen.getByText('Server exploded')).toBeInTheDocument();
  });

  it('submits a valid email through to onSubmit', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    renderCard({ onSubmit });
    fireEvent.change(screen.getByLabelText(/Email/i), {
      target: { value: 'hello@duncit.com' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Send reset OTP/i }));
    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit).toHaveBeenCalledWith({ email: 'hello@duncit.com' });
  });

  it('does not call onSubmit for an invalid email', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    renderCard({ onSubmit });
    fireEvent.change(screen.getByLabelText(/Email/i), {
      target: { value: 'not-an-email' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Send reset OTP/i }));
    await waitFor(() => expect(screen.getByText(/Enter a valid email/i)).toBeInTheDocument());
    expect(onSubmit).not.toHaveBeenCalled();
  });
});
