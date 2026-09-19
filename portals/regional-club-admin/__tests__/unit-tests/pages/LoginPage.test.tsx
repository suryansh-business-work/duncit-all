import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { PortalLoginPageProps } from '@duncit/shell';
import LoginPage from '../../../src/pages/LoginPage';
import { appConfig } from '../../../src/config/app-config';
import { accessDeniedMessage, hasAppAccess, setToken } from '../../../src/lib/session';

const probe = vi.hoisted(() => ({ props: null as PortalLoginPageProps | null }));

vi.mock('@duncit/shell', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@duncit/shell')>()),
  PortalLoginPage: (props: PortalLoginPageProps) => {
    probe.props = props;
    return <div data-testid="portal-login">{props.appConfig.fullName}</div>;
  },
}));

describe('LoginPage', () => {
  it('mounts the shared login page with this console’s config and session', () => {
    render(<LoginPage />);
    expect(screen.getByTestId('portal-login')).toHaveTextContent('Duncit Regional Club Admin');
    expect(probe.props?.appConfig).toBe(appConfig);
    expect(probe.props?.session.setToken).toBe(setToken);
    expect(probe.props?.session.hasAppAccess).toBe(hasAppAccess);
    expect(probe.props?.session.accessDeniedMessage).toBe(accessDeniedMessage);
  });
});
