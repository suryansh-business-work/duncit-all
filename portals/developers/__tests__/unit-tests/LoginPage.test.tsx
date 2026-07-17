import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

const portalLoginSpy = vi.fn();

vi.mock('@duncit/shell', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@duncit/shell')>()),
  PortalLoginPage: (props: Record<string, unknown>) => {
    portalLoginSpy(props);
    return <div data-testid="portal-login" />;
  },
}));

import LoginPage from '../../src/pages/LoginPage';
import { appConfig } from '../../src/config/app-config';

describe('LoginPage', () => {
  it('renders the shared PortalLoginPage wired with this portal config + session', () => {
    render(<LoginPage />);
    expect(screen.getByTestId('portal-login')).toBeInTheDocument();
    const props = portalLoginSpy.mock.calls[0][0];
    expect(props.appConfig).toBe(appConfig);
    expect(typeof props.session.setToken).toBe('function');
    expect(typeof props.session.hasAppAccess).toBe('function');
    expect(typeof props.session.accessDeniedMessage).toBe('function');
  });
});
