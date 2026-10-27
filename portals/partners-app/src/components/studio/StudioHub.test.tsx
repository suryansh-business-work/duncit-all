import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, screen } from '@testing-library/react';
import StudioHub from './StudioHub';
import { renderWithProviders } from '../../__tests__/render';

afterEach(cleanup);

const tabs = [
  { to: '/host/pods', label: 'Your Pods', render: () => <p>Pods page</p> },
  { to: '/host/auto-pods', label: 'Auto Pods', render: () => <p>Auto pods page</p> },
];

const open = (route: string, items = tabs) =>
  renderWithProviders(<StudioHub id="hub" label="Pods" tabs={items} />, { route, path: '*' });

describe('StudioHub', () => {
  it('opens on the tab its route names and shows only that tab page', () => {
    open('/host/auto-pods');
    expect(screen.getByText('Auto pods page')).toBeTruthy();
    expect(screen.queryByText('Pods page')).toBeNull();
    expect(screen.getByRole('tab', { name: 'Auto Pods' }).getAttribute('aria-selected')).toBe('true');
  });

  it('opens on the first tab for a route that names none', () => {
    open('/host/somewhere-else');
    expect(screen.getByText('Pods page')).toBeTruthy();
  });

  it('navigates to the clicked tab route', () => {
    open('/host/pods');
    fireEvent.click(screen.getByRole('tab', { name: 'Auto Pods' }));
    expect(screen.getByTestId('location').textContent).toBe('/host/auto-pods');
    expect(screen.getByText('Auto pods page')).toBeTruthy();
  });

  it('draws no tab strip for a single tab', () => {
    open('/host/pods', tabs.slice(0, 1));
    expect(screen.getByText('Pods page')).toBeTruthy();
    expect(screen.queryByRole('tablist')).toBeNull();
  });

  it('draws nothing when it has no tabs', () => {
    open('/host/pods', []);
    expect(screen.queryByTestId('hub')).toBeNull();
  });
});
