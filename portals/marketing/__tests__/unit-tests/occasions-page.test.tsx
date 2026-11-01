import { describe, expect, it, vi } from 'vitest';
import { fireEvent, screen } from '@testing-library/react';
import { Route } from 'react-router';
import { renderWithProviders } from '../testkit';

// Each tab is tested in its own suite; here they only say which one is showing.
vi.mock('../../src/pages/occasions-page/live/LiveTab', () => ({ default: () => <div data-testid="tab-live" /> }));
vi.mock('../../src/pages/occasions-page/themes/ThemesTab', () => ({ default: () => <div data-testid="tab-themes" /> }));
vi.mock('../../src/pages/occasions-page/schedule/ScheduleTab', () => ({ default: () => <div data-testid="tab-schedule" /> }));
vi.mock('../../src/pages/occasions-page/app-icons/AppIconsTab', () => ({ default: () => <div data-testid="tab-app-icons" /> }));
vi.mock('../../src/pages/occasions-page/store/StoreOccasionsTab', () => ({ default: () => <div data-testid="tab-store" /> }));

import OccasionsPage from '../../src/pages/occasions-page';

const TABS = ['tab-live', 'tab-themes', 'tab-schedule', 'tab-app-icons', 'tab-store'];

const renderAt = (url: string) =>
  renderWithProviders(<OccasionsPage />, { initialEntries: [url], routes: <Route path="/occasions" element={<OccasionsPage />} /> });

const showing = () => TABS.filter((id) => screen.queryByTestId(id));

describe('OccasionsPage', () => {
  it('opens on Live now under the page heading, with every tab offered in order', () => {
    renderAt('/occasions');
    expect(screen.getByRole('heading', { name: 'Occasions' })).toBeInTheDocument();
    expect(screen.getByText(/Dress every Duncit app for the festival\./)).toBeInTheDocument();
    expect(screen.getAllByRole('tab').map((tab) => tab.textContent)).toEqual(['Live now', 'Looks', 'Schedule', 'App icons', 'Ecomm store']);
    expect(screen.getByRole('tab', { name: 'Live now' })).toHaveAttribute('aria-selected', 'true');
    expect(showing()).toEqual(['tab-live']);
  });

  it('opens the tab the link names', () => {
    renderAt('/occasions?selectedtab=store');
    expect(screen.getByRole('tab', { name: 'Ecomm store' })).toHaveAttribute('aria-selected', 'true');
    expect(showing()).toEqual(['tab-store']);
  });

  it('falls back to Live now for a tab it does not have', () => {
    renderAt('/occasions?selectedtab=nope');
    expect(showing()).toEqual(['tab-live']);
  });

  it('shows one tab at a time as they are picked', () => {
    renderAt('/occasions');
    fireEvent.click(screen.getByRole('tab', { name: 'Looks' }));
    expect(showing()).toEqual(['tab-themes']);
    fireEvent.click(screen.getByRole('tab', { name: 'Schedule' }));
    expect(showing()).toEqual(['tab-schedule']);
    fireEvent.click(screen.getByRole('tab', { name: 'App icons' }));
    expect(showing()).toEqual(['tab-app-icons']);
    expect(screen.getByRole('tab', { name: 'App icons' })).toHaveAttribute('aria-selected', 'true');
    fireEvent.click(screen.getByRole('tab', { name: 'Live now' }));
    expect(showing()).toEqual(['tab-live']);
  });
});
