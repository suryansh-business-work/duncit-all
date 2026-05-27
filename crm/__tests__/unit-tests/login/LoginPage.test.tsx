import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MockedProvider } from '@apollo/client/testing';
import { MemoryRouter } from 'react-router-dom';
import { gql } from '@apollo/client';
import { ColorModeProvider } from '@/ColorModeContext';
import LoginPage from '@/pages/LoginPage';
import { clearToken, getToken } from '@/lib/session';

const LOGIN = gql`
  mutation ConsoleLogin($input: LoginInput!) {
    login(input: $input) {
      token
      user { user_id first_name last_name email roles }
    }
  }
`;

vi.mock('@/components/GoogleSignInButton', () => ({
  default: () => <div data-testid="google-mock">google</div>,
}));

const wrap = (mocks: any[], initialEntries: string[] = ['/login']) =>
  render(
    <MockedProvider mocks={mocks} addTypename={false}>
      <MemoryRouter initialEntries={initialEntries}>
        <ColorModeProvider>
          <LoginPage />
        </ColorModeProvider>
      </MemoryRouter>
    </MockedProvider>
  );

describe('LoginPage', () => {
  beforeEach(() => clearToken());

  it('renders the login form and the OR divider', () => {
    wrap([]);
    expect(screen.getByText(/Sign in to/i)).toBeTruthy();
    expect(screen.getByText('OR')).toBeTruthy();
  });

  it('shows the access-denied warning when ?denied=1 is set', () => {
    wrap([], ['/login?denied=1']);
    expect(screen.getByText(/You do not have access/i)).toBeTruthy();
  });

  it('persists the token on successful login', async () => {
    const mocks = [
      {
        request: {
          query: LOGIN,
          variables: { input: { email: 'admin@duncit.com', password: '12345678' } },
        },
        result: {
          data: {
            login: {
              token: 'tok-123',
              user: {
                user_id: 'u1',
                first_name: 'Admin',
                last_name: 'User',
                email: 'admin@duncit.com',
                roles: ['SUPER_ADMIN'],
              },
            },
          },
        },
      },
    ];
    wrap(mocks);
    fireEvent.change(screen.getByLabelText(/Email/i), {
      target: { value: 'admin@duncit.com' },
    });
    fireEvent.change(screen.getByLabelText(/^Password$/i), {
      target: { value: '12345678' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Open CRM/i }));
    await waitFor(() => expect(getToken()).toBe('tok-123'));
  });

  it('surfaces an access-denied alert for roles without app access', async () => {
    const mocks = [
      {
        request: {
          query: LOGIN,
          variables: { input: { email: 'guest@duncit.com', password: '12345678' } },
        },
        result: {
          data: {
            login: {
              token: 'tok-x',
              user: {
                user_id: 'u2',
                first_name: 'G',
                last_name: 'U',
                email: 'guest@duncit.com',
                roles: ['CUSTOMER'],
              },
            },
          },
        },
      },
    ];
    wrap(mocks);
    fireEvent.change(screen.getByLabelText(/Email/i), {
      target: { value: 'guest@duncit.com' },
    });
    fireEvent.change(screen.getByLabelText(/^Password$/i), {
      target: { value: '12345678' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Open CRM/i }));
    expect(await screen.findByText(/do not have access/i)).toBeTruthy();
    expect(getToken()).toBeNull();
  });
});
