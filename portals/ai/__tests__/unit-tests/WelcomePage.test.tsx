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

  it('falls back to "there" when the user has no name', () => {
    userMock.value = { user: null };
    renderWithProviders(<WelcomePage />);
    expect(screen.getByText('Hi there')).toBeInTheDocument();
    expect(screen.getAllByText(appConfig.portalLabel).length).toBeGreaterThan(0);
  });
});
