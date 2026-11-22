import { describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithProviders } from '../testkit';

// The session gate and sign-out live in the shell's PortalAppShell and are
// tested there; this portal's part is handing it its own config and session.
const clearTokenSpy = vi.hoisted(() => vi.fn());
const hasAppAccessSpy = vi.hoisted(() => vi.fn());
const shellProps = vi.hoisted(() => ({ current: null as Record<string, unknown> | null }));

vi.mock('../../src/lib/session', () => ({
  clearToken: clearTokenSpy,
  hasAppAccess: hasAppAccessSpy,
}));
vi.mock('@duncit/shell', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@duncit/shell')>()),
  PortalAppShell: (props: Record<string, unknown>) => {
    shellProps.current = props;
    return <div data-testid="portal-shell">{props.children as React.ReactNode}</div>;
  },
}));

import AppShell from '../../src/components/AppShell';
import { appConfig } from '../../src/config/app-config';

describe('AppShell adapter', () => {
  it('renders its children inside the shared console chrome', () => {
    renderWithProviders(
      <AppShell>
        <div>child-content</div>
      </AppShell>,
    );

    expect(screen.getByTestId('portal-shell')).toContainElement(screen.getByText('child-content'));
  });

  it("hands the shell this portal's config, sidebar, session gate and profile route", () => {
    renderWithProviders(<AppShell>x</AppShell>);

    expect(shellProps.current).toMatchObject({
      config: appConfig,
      nav: appConfig.nav,
      clearToken: clearTokenSpy,
      hasAppAccess: hasAppAccessSpy,
      profileTo: '/profile',
    });
  });
});
