import { describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import LoginPage from '../../src/pages/LoginPage';
import { appConfig } from '../../src/config/app-config';
import { renderWithProviders } from './testkit';

const captured = vi.hoisted(() => ({ props: null as unknown as Record<string, any> }));

vi.mock('@duncit/shell', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@duncit/shell')>()),
  PortalLoginPage: (props: Record<string, any>) => {
    captured.props = props;
    return <div data-testid="portal-login">{props.appConfig.fullName}</div>;
  },
}));

describe('LoginPage', () => {
  it('renders the shared portal login with this portal config and session', () => {
    renderWithProviders(<LoginPage />);
    expect(screen.getByTestId('portal-login')).toHaveTextContent('Duncit Ads');
    expect(captured.props.appConfig).toBe(appConfig);
    expect(typeof captured.props.session.setToken).toBe('function');
    expect(typeof captured.props.session.hasAppAccess).toBe('function');
    expect(typeof captured.props.session.accessDeniedMessage).toBe('function');
  });
});
