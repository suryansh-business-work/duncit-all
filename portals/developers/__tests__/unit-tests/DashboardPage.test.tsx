import { describe, expect, it, vi, beforeEach } from 'vitest';
import { fireEvent, screen } from '@testing-library/react';
import type { MockedResponse } from '@apollo/client/testing';
import { MY_DASHBOARD_LAYOUT } from '@duncit/dashboard';
import { renderWithProviders } from '../testkit';

const navigateSpy = vi.hoisted(() => vi.fn());

vi.mock('react-router', async (importOriginal) => ({
  ...(await importOriginal<typeof import('react-router')>()),
  useNavigate: () => navigateSpy,
}));

import DashboardPage from '../../src/pages/DashboardPage';

/** The page is a DuncitDashboard, which reads the viewer's saved layout first;
 * "never customised" makes it paint the default tiles. */
const noSavedLayout: MockedResponse = {
  request: { query: MY_DASHBOARD_LAYOUT, variables: { dashboard_id: 'developers.overview' } },
  result: { data: { myDashboardLayout: null } },
};

const renderPage = () => renderWithProviders(<DashboardPage />, { mocks: [noSavedLayout] });

describe('DashboardPage', () => {
  beforeEach(() => {
    navigateSpy.mockReset();
  });

  it('renders the heading and both navigation tiles', async () => {
    renderPage();
    expect(screen.getByRole('heading', { name: 'Developers' })).toBeInTheDocument();
    expect(await screen.findByText('API Keys')).toBeInTheDocument();
    expect(screen.getByText('API Reference')).toBeInTheDocument();
  });

  it('navigates to /keys when the API Keys tile is clicked', async () => {
    renderPage();
    fireEvent.click(await screen.findByText('API Keys'));
    expect(navigateSpy).toHaveBeenCalledWith('/keys');
  });

  it('navigates to /docs when the API Reference tile is clicked', async () => {
    renderPage();
    fireEvent.click(await screen.findByText('API Reference'));
    expect(navigateSpy).toHaveBeenCalledWith('/docs');
  });
});
