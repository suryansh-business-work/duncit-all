import { afterEach, describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import WelcomePage from '../../src/pages/WelcomePage';
import { appConfig } from '../../src/config/app-config';
import { renderWithProviders } from '../testkit';

/**
 * The real dashboard is GridStack, which needs a live layout engine jsdom does
 * not have — left real, none of the widgets' content mounts and the page looks
 * empty. Here it simply renders each widget, which is all this page asks of it.
 */
vi.mock('@duncit/dashboard', () => ({
  DuncitDashboard: ({ header, widgets }: { header: React.ReactNode; widgets: { id: string; content: React.ReactNode }[] }) => (
    <div data-testid="dashboard">
      {header}
      {widgets.map((widget) => (
        <div key={widget.id} data-testid={`widget-${widget.id}`}>
          {widget.content}
        </div>
      ))}
    </div>
  ),
}));

const userMock = vi.hoisted(() => ({ value: {} as { user: unknown } }));
vi.mock('@duncit/user-context', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@duncit/user-context')>()),
  useUserData: () => userMock.value,
}));

afterEach(() => {
  userMock.value = { user: null };
});

describe('WelcomePage', () => {
  it('greets the user by first name when present', () => {
    userMock.value = { user: { first_name: 'Asha', full_name: 'Asha Rao' } };
    renderWithProviders(<WelcomePage />);
    expect(screen.getByText('Hi Asha')).toBeInTheDocument();
    expect(screen.getByText(`Welcome to ${appConfig.fullName}`)).toBeInTheDocument();
  });

  it('falls back to the full name when there is no first name', () => {
    userMock.value = { user: { first_name: '', full_name: 'Asha Rao' } };
    renderWithProviders(<WelcomePage />);
    expect(screen.getByText('Hi Asha Rao')).toBeInTheDocument();
  });

  it('uses the plain tagline when the config names no catalogue key', async () => {
    vi.resetModules();
    vi.doMock('../../src/config/app-config', async (io) => {
      const actual = await io<typeof import('../../src/config/app-config')>();
      // A portal that has not had its tagline translated yet still has to show
      // one — the literal is the fallback, not a blank subtitle.
      return { appConfig: { ...actual.appConfig, taglineKey: undefined, tagline: 'Plain tagline' } };
    });
    const Page = (await import('../../src/pages/WelcomePage')).default;

    userMock.value = { user: null };
    renderWithProviders(<Page />);

    expect(screen.getByText('Plain tagline')).toBeInTheDocument();
    vi.doUnmock('../../src/config/app-config');
  });

  it('falls back to "there" when the user has no name', () => {
    userMock.value = { user: null };
    renderWithProviders(<WelcomePage />);
    expect(screen.getByText('Hi there')).toBeInTheDocument();
    expect(screen.getAllByText(appConfig.portalLabel).length).toBeGreaterThan(0);
  });
});
