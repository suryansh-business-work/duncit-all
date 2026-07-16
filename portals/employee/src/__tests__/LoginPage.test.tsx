import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('../lib/session', () => ({
  setToken: vi.fn(),
  hasAppAccess: vi.fn(),
  accessDeniedMessage: vi.fn(),
}));

let captured: { appConfig?: { key?: string }; session?: Record<string, unknown> } = {};

vi.mock('@duncit/shell', () => ({
  // app-config (real, imported by LoginPage) pulls parseEnvRoles from the shell.
  parseEnvRoles: (_env: unknown, fallback: string[]) => fallback,
  PortalLoginPage: (props: Readonly<{ appConfig: { key: string }; session: Record<string, unknown> }>) => {
    captured = props;
    return <div data-testid="portal-login" data-key={props.appConfig.key} />;
  },
}));

import LoginPage from '../pages/LoginPage';

describe('LoginPage', () => {
  it('renders the shared PortalLoginPage wired with the employee config + session', () => {
    render(<LoginPage />);
    expect(screen.getByTestId('portal-login')).toHaveAttribute('data-key', 'employee');
    expect(captured.session).toEqual(
      expect.objectContaining({
        setToken: expect.any(Function),
        hasAppAccess: expect.any(Function),
        accessDeniedMessage: expect.any(Function),
      }),
    );
  });
});
