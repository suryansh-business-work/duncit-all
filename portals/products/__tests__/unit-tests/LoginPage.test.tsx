import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import LoginPage from '../../src/pages/LoginPage';
import { appConfig } from '../../src/config/app-config';
import { hasAppAccess, setToken } from '../../src/lib/session';

const probe = vi.hoisted(() => ({ props: null as null | Record<string, any> }));
vi.mock('@duncit/shell', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@duncit/shell')>()),
  PortalLoginPage: (props: Record<string, any>) => {
    probe.props = props;
    return <div data-testid="portal-login">{props.appConfig.fullName}</div>;
  },
}));

describe('LoginPage', () => {
  it('mounts the shared PortalLoginPage with this portal config and session helpers', () => {
    render(<LoginPage />);
    expect(screen.getByTestId('portal-login')).toHaveTextContent('Duncit Products');
    expect(probe.props?.appConfig).toBe(appConfig);
    // The session helpers are wired straight through to the shared page.
    expect(probe.props?.session.setToken).toBe(setToken);
    expect(probe.props?.session.hasAppAccess).toBe(hasAppAccess);
    expect(typeof probe.props?.session.accessDeniedMessage).toBe('function');
  });
});
