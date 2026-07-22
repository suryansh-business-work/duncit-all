import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MockedProvider } from '@apollo/client/testing';
import { MemoryRouter } from 'react-router-dom';
import { GraphQLError } from 'graphql';
import ForgotPasswordPage from '../ForgotPasswordPage';
import { REQUEST_PASSWORD_RESET_OTP } from '../queries';

const navigateMock = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return { ...actual, useNavigate: () => navigateMock };
});

function registeredMock(email: string) {
  return {
    request: { query: REQUEST_PASSWORD_RESET_OTP, variables: { email } },
    result: { data: { requestPasswordResetOtp: { ok: true, dev_otp: '123456', registered: true } } },
  };
}

function unregisteredMock(email: string) {
  return {
    request: { query: REQUEST_PASSWORD_RESET_OTP, variables: { email } },
    result: { data: { requestPasswordResetOtp: { ok: false, dev_otp: null, registered: false } } },
  };
}

function errorMock(email: string) {
  return {
    request: { query: REQUEST_PASSWORD_RESET_OTP, variables: { email } },
    result: { errors: [new GraphQLError('Server exploded')] },
  };
}

function renderPage(mocks: readonly unknown[]) {
  return render(
    <MockedProvider mocks={mocks as never} addTypename={false}>
      <MemoryRouter>
        <ForgotPasswordPage />
      </MemoryRouter>
    </MockedProvider>,
  );
}

function typeEmail(email: string) {
  fireEvent.change(screen.getByLabelText(/Email/i), { target: { value: email } });
}

describe('ForgotPasswordPage', () => {
  beforeEach(() => {
    navigateMock.mockReset();
  });

  it('renders the card inside the auth background', () => {
    renderPage([]);
    expect(screen.getByText('password?')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Send reset OTP/i })).toBeInTheDocument();
  });

  it('navigates to reset-password when the email is registered', async () => {
    const email = 'hello@duncit.com';
    renderPage([registeredMock(email)]);
    typeEmail(email);
    fireEvent.click(screen.getByRole('button', { name: /Send reset OTP/i }));
    await waitFor(() =>
      expect(navigateMock).toHaveBeenCalledWith(`/reset-password?email=${encodeURIComponent(email)}`),
    );
  });

  it('flags unregistered email and shows Create Account CTA without navigating', async () => {
    const email = 'ghost@duncit.com';
    renderPage([unregisteredMock(email)]);
    typeEmail(email);
    fireEvent.click(screen.getByRole('button', { name: /Send reset OTP/i }));
    await waitFor(() => expect(screen.getByText('Unregistered User')).toBeInTheDocument());
    expect(screen.getByRole('link', { name: /Create Account/i })).toHaveAttribute('href', '/register');
    expect(navigateMock).not.toHaveBeenCalled();
  });

  it('surfaces a server error and does not navigate', async () => {
    const email = 'boom@duncit.com';
    renderPage([errorMock(email)]);
    typeEmail(email);
    fireEvent.click(screen.getByRole('button', { name: /Send reset OTP/i }));
    await waitFor(() => expect(screen.getByText(/Server exploded/i)).toBeInTheDocument());
    expect(navigateMock).not.toHaveBeenCalled();
  });
});
