import { describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import LoginPage from '../../src/pages/LoginPage';
import { appConfig } from '../../src/config/app-config';
import { hasAppAccess, setToken } from '../../src/lib/session';
import { renderWithProviders } from '../testkit';

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
    renderWithProviders(<LoginPage />);
    expect(screen.getByTestId('portal-login')).toHaveTextContent('Duncit Challenges');
    expect(probe.props?.appConfig).toBe(appConfig);
    // The session helpers are wired straight through to the shared page.
    expect(probe.props?.session.setToken).toBe(setToken);
    expect(probe.props?.session.hasAppAccess).toBe(hasAppAccess);
    expect(typeof probe.props?.session.accessDeniedMessage).toBe('function');
  });
});
