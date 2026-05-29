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

const wrap = (mocks: any[], initialEntries: string[] = ['/login']) =>
  render(
    <MockedProvider mocks={mocks} addTypename={false}>
      <MemoryRouter initialEntries={initialEntries}>
        <ColorModeProvider>
          <LoginPage />
        </ColorModeProvider>
      </MemoryRouter>
    </MockedProvider>,
  );

const fillAndSubmit = (email: string, password: string) => {
  fireEvent.change(screen.getByPlaceholderText('e-mail address'), { target: { value: email } });
  fireEvent.change(screen.getByPlaceholderText('password'), { target: { value: password } });
  fireEvent.click(screen.getByRole('button', { name: /^sign in$/i }));
};

const loginMock = (email: string, password: string, roles: string[], token = 'tok-123') => ({
  request: { query: LOGIN, variables: { input: { email, password } } },
  result: {
    data: {
      login: { token, user: { user_id: 'u1', first_name: 'A', last_name: 'B', email, roles } },
    },
  },
});

describe('LoginPage', () => {
  beforeEach(() => clearToken());

  it('renders the login form', () => {
    wrap([]);
    expect(screen.getByRole('heading', { name: /log in/i })).toBeTruthy();
    expect(screen.getByPlaceholderText('e-mail address')).toBeTruthy();
    expect(screen.getByPlaceholderText('password')).toBeTruthy();
  });

  it('shows the access-denied warning when ?denied=1 is set', () => {
    wrap([], ['/login?denied=1']);
    expect(screen.getByText(/you do not have access/i)).toBeTruthy();
  });

  it('persists the token on successful login', async () => {
    wrap([loginMock('admin@duncit.com', '12345678', ['SUPER_ADMIN'])]);
    fillAndSubmit('admin@duncit.com', '12345678');
    await waitFor(() => expect(getToken()).toBe('tok-123'));
  });

  it('surfaces an access-denied alert for roles without app access', async () => {
    wrap([loginMock('guest@duncit.com', '12345678', ['CUSTOMER'], 'tok-x')]);
    fillAndSubmit('guest@duncit.com', '12345678');
    expect(await screen.findByText(/do not have access/i)).toBeTruthy();
    expect(getToken()).toBeNull();
  });
});
