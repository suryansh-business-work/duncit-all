import { describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import { ConfirmProvider } from '@duncit/dialogs';
import UgcMonitoringPage from '../../src/pages/ugc-monitoring';
import { renderWithProviders } from '../testkit';
import { reportCategoriesMock } from '../mocks';
import { __setTableRows } from './table-mock';

vi.mock('@duncit/table', () => import('./table-mock'));

/**
 * The UGC Monitoring desk: three jobs on three tabs, and the open tab lives in
 * the URL so a link to the settings opens the settings.
 */
const renderPage = (entry = '/') => {
  __setTableRows([]);
  return renderWithProviders(
    <ConfirmProvider>
      <UgcMonitoringPage />
    </ConfirmProvider>,
    { initialEntries: [entry], mocks: [reportCategoriesMock(), reportCategoriesMock()] },
  );
};

describe('UgcMonitoringPage', () => {
  it('opens on the reported-content queue and names the three sections', async () => {
    renderPage();

    expect(screen.getByText('UGC Monitoring')).toBeInTheDocument();
    expect(screen.getByTestId('ugc-tab-reported')).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByTestId('ugc-tab-blocked')).toHaveAttribute('aria-selected', 'false');
    expect(screen.getByTestId('ugc-tab-settings')).toHaveAttribute('aria-selected', 'false');
    expect(await screen.findByTestId('ugc-reported-tab')).toBeInTheDocument();
    expect(screen.queryByTestId('ugc-settings-tab')).not.toBeInTheDocument();
  });

  it('opens straight onto the settings from a link', async () => {
    renderPage('/?selectedtab=settings');

    expect(screen.getByTestId('ugc-tab-settings')).toHaveAttribute('aria-selected', 'true');
    expect(await screen.findByTestId('ugc-settings-tab')).toBeInTheDocument();
    expect(screen.queryByTestId('ugc-reported-tab')).not.toBeInTheDocument();
  });

  it('switches to the blocked accounts record when its tab is chosen', async () => {
    renderPage();
    fireEvent.click(screen.getByTestId('ugc-tab-blocked'));

    await waitFor(() =>
      expect(screen.getByTestId('ugc-tab-blocked')).toHaveAttribute('aria-selected', 'true'),
    );
    expect(await screen.findByText('Nobody has blocked anyone yet.')).toBeInTheDocument();
    expect(screen.queryByTestId('ugc-reported-tab')).not.toBeInTheDocument();
  });

  it('falls back to the queue when the link names a tab that does not exist', async () => {
    renderPage('/?selectedtab=nonsense');
    expect(screen.getByTestId('ugc-tab-reported')).toHaveAttribute('aria-selected', 'true');
    expect(await screen.findByTestId('ugc-reported-tab')).toBeInTheDocument();
  });
});
