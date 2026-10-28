import { screen, waitFor } from '@testing-library/react';
import type { MockedResponse } from '@apollo/client/testing';
import { describe, expect, it, vi } from 'vitest';
import type { LiteEvent } from '../../../../shared/graphql/documents';
import { LITE_EVENT } from '../../../graphql/events';
import { ScanPage } from '../../../pages/scan';
import { eventFixture, meFixture, renderWithProviders, statsFixture } from '../../test-utils';

vi.mock('@duncit/host-pod-actions/qr-scanner', () => ({
  useQrScanner: () => ({ videoRef: { current: null }, canvasRef: { current: null }, error: null }),
}));

const eventMock = (liteEvent: LiteEvent | null): MockedResponse => ({ request: { query: LITE_EVENT, variables: { slug: 'garden-party' } }, result: { data: { liteEvent } } });

const renderPage = (mocks: MockedResponse[], signedIn = true) =>
  renderWithProviders(<ScanPage />, { route: '/e/garden-party/scan', path: '/e/:slug/scan', mocks, me: signedIn ? meFixture() : null });

describe('ScanPage', () => {
  it('asks a signed-out reader to sign in as a host first', () => {
    renderPage([], false);

    expect(screen.getByTestId('signed-in-gate')).toHaveTextContent('Sign in as a host of this event to check guests in.');
    expect(screen.queryByTestId('scanner-panel')).not.toBeInTheDocument();
  });

  it('turns away a signed-in reader who does not host the event', async () => {
    renderPage([eventMock(eventFixture({ viewer_is_host: false }))]);

    expect(await screen.findByTestId('scan-not-host')).toHaveTextContent('Only the hosts of this event can check guests in.');
    expect(screen.queryByTestId('scanner-panel')).not.toBeInTheDocument();
  });

  it('opens the scanner for a host, under the event’s name, with the running tally', async () => {
    renderPage([eventMock(eventFixture({ viewer_is_host: true, stats: statsFixture({ going: 10, checked_in: 3 }) }))]);

    expect(await screen.findByTestId('scanner-panel')).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1, name: 'Garden Party' })).toBeInTheDocument();
    expect(screen.getByText('Check-in scanner')).toBeInTheDocument();
    expect(screen.getByText('3 of 10 checked in')).toBeInTheDocument();
    const bar = screen.getByRole('progressbar', { name: 'Guests checked in' });
    expect(bar).toHaveAttribute('aria-valuenow', '30');
  });

  it('draws an empty bar, not a broken one, before anyone is going', async () => {
    renderPage([eventMock(eventFixture({ viewer_is_host: true, stats: statsFixture({ going: 0, checked_in: 0 }) }))]);

    const bar = await screen.findByRole('progressbar', { name: 'Guests checked in' });
    expect(bar).toHaveAttribute('aria-valuenow', '0');
    expect(screen.getByText('0 of 0 checked in')).toBeInTheDocument();
  });

  it('shows the not-found page for an unknown event', async () => {
    renderPage([eventMock(null)]);
    expect(await screen.findByTestId('not-found')).toBeInTheDocument();
  });

  it('shows the API error when the event cannot be read', async () => {
    renderPage([{ request: { query: LITE_EVENT, variables: { slug: 'garden-party' } }, result: { errors: [{ message: 'Event service unavailable' }] } }]);
    expect(await screen.findByTestId('query-guard-error')).toHaveTextContent('Event service unavailable');
  });

  it('titles the browser tab as the check-in scanner', async () => {
    renderPage([], false);
    await waitFor(() => expect(document.title).toBe('Check-in scanner | Duncit Lite'));
  });
});
