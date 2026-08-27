import { describe, expect, it, vi, beforeEach } from 'vitest';
import { screen, fireEvent, waitFor, within } from '@testing-library/react';
import { GraphQLError } from 'graphql';
import { renderWithProviders } from '../testkit';
import { makeAdRequestRow } from '../mocks';
import { __setTableRows, fetchRowsFrom } from './table-mock';

vi.mock('@duncit/table', () => import('./table-mock'));
vi.mock('@duncit/app-settings', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@duncit/app-settings')>()),
  useDateFormat: () => ({ formatDateTime: (d: Date | string) => `fmt:${String(d)}` }),
}));
const dialogsMock = vi.hoisted(() => ({ notifySuccess: vi.fn() }));
vi.mock('@duncit/dialogs', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@duncit/dialogs')>()),
  notifySuccess: dialogsMock.notifySuccess,
}));

import LiveAdsPage from '../../src/pages/live-ads-page/LiveAdsPage';
import LiveAdsTable from '../../src/pages/live-ads-page/LiveAdsTable';
import LiveAdDetailsDialog from '../../src/pages/live-ads-page/LiveAdDetailsDialog';
import { getLiveAdColumns } from '../../src/pages/live-ads-page/columns';
import { DELETE_AD_REQUEST, STOP_AD_REQUEST } from '../../src/pages/live-ads-page/queries';
import type { AdRequestRow } from '../../src/pages/ads-approvals-page/helpers';

const liveAd = (over: Partial<AdRequestRow> = {}): AdRequestRow =>
  makeAdRequestRow({ id: 'ad1', status: 'LIVE', ad_title: 'Diwali banner', ...over });

const stopMock = (id = 'ad1', failWith?: string) => ({
  request: { query: STOP_AD_REQUEST, variables: { id } },
  ...(failWith
    ? { result: { errors: [new GraphQLError(failWith)] } }
    : {
        result: {
          data: {
            stopAdRequest: {
              __typename: 'AdRequest',
              id,
              status: 'EXPIRED',
              end_at: '2026-07-31T00:00:00.000Z',
            },
          },
        },
      }),
});

const deleteMock = (id = 'ad1') => ({
  request: { query: DELETE_AD_REQUEST, variables: { id } },
  result: { data: { deleteAdRequest: true } },
});

const fmt = (d: Date) => d.toISOString();

const renderTable = (rows: AdRequestRow[], handlers: Record<string, () => void> = {}) =>
  renderWithProviders(
    <LiveAdsTable
      fetchRows={fetchRowsFrom(rows) as never}
      refetchRef={{ current: null }}
      formatDate={fmt}
      onOpen={handlers.onOpen ?? vi.fn()}
      onStop={handlers.onStop ?? vi.fn()}
      onDelete={handlers.onDelete ?? vi.fn()}
    />,
  );

beforeEach(() => {
  __setTableRows([]);
  dialogsMock.notifySuccess.mockClear();
});

describe('live ad columns', () => {
  const cols = () => getLiveAdColumns({ formatDate: fmt, onStop: vi.fn(), onDelete: vi.fn() });
  const value = (field: string, row: AdRequestRow) =>
    cols().find((c) => c.field === field)?.valueGetter?.(row);

  it('reads the sortable value off each column', () => {
    const row = liveAd({ brand_name: 'Acme', approved_cost: 1400 });
    expect(value('ad_title', row)).toBe('Diwali banner');
    expect(value('submitted_by_name', row)).toBe('Acme');
    expect(value('status', row)).toBe('LIVE');
    expect(value('ad_type', row)).toBe(row.ad_type);
  });

  // A brandless ad still has a submitter, and an unapproved cost still has an
  // estimate — neither cell should ever be blank.
  it('falls back to the submitter and the estimate', () => {
    const row = liveAd({ brand_name: null, approved_cost: null, estimated_cost: 700 });
    expect(value('submitted_by_name', row)).toBe(row.submitted_by_name);
    expect(String(value('approved_cost', row))).toContain('700');
  });

  it('renders the ad title with its trace id', async () => {
    renderTable([liveAd({ brand_name: 'Acme' })]);
    const row = await screen.findByTestId('table-row');
    expect(within(row).getByTestId('cell-ad_title')).toHaveTextContent('Diwali banner');
    expect(within(row).getByTestId('cell-ad_title')).toHaveTextContent('AD-1');
    expect(within(row).getByTestId('cell-submitted_by_name')).toHaveTextContent('Acme');
  });

  it('shows an em dash when there is no advertiser at all', async () => {
    renderTable([liveAd({ brand_name: null, submitted_by_name: '' })]);
    const row = await screen.findByTestId('table-row');
    expect(within(row).getByTestId('cell-submitted_by_name')).toHaveTextContent('—');
  });

  it('exposes Stop and Delete on every row', async () => {
    const onStop = vi.fn();
    const onDelete = vi.fn();
    renderTable([liveAd()], { onStop, onDelete });
    fireEvent.click(await screen.findByRole('button', { name: 'Stop this ad' }));
    expect(onStop).toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Delete this ad' }));
    expect(onDelete).toHaveBeenCalled();
  });
});

describe('LiveAdDetailsDialog', () => {
  it('renders nothing until a row is opened', () => {
    const { container } = renderWithProviders(
      <LiveAdDetailsDialog
        ad={null}
        busy={false}
        formatDateTime={String}
        onClose={vi.fn()}
        onStop={vi.fn()}
        onDelete={vi.fn()}
      />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('shows the ad and offers both actions', () => {
    const onStop = vi.fn();
    const onDelete = vi.fn();
    const onClose = vi.fn();
    const ad = liveAd();
    renderWithProviders(
      <LiveAdDetailsDialog
        ad={ad}
        busy={false}
        formatDateTime={String}
        onClose={onClose}
        onStop={onStop}
        onDelete={onDelete}
      />,
    );
    const dialog = within(screen.getByRole('dialog'));
    // The trace id heads the dialog and repeats in the reused detail block.
    expect(dialog.getAllByText('AD-1').length).toBeGreaterThan(0);
    expect(dialog.getAllByText('Diwali banner').length).toBeGreaterThan(0);

    fireEvent.click(dialog.getByRole('button', { name: 'Stop ad' }));
    expect(onStop).toHaveBeenCalledWith(ad);
    fireEvent.click(dialog.getByRole('button', { name: 'Delete' }));
    expect(onDelete).toHaveBeenCalledWith(ad);
    fireEvent.click(dialog.getByRole('button', { name: 'Close' }));
    expect(onClose).toHaveBeenCalled();
  });

  it('locks every exit while a mutation is in flight', () => {
    renderWithProviders(
      <LiveAdDetailsDialog
        ad={liveAd()}
        busy
        formatDateTime={String}
        onClose={vi.fn()}
        onStop={vi.fn()}
        onDelete={vi.fn()}
      />,
    );
    const dialog = within(screen.getByRole('dialog'));
    expect(dialog.getByRole('button', { name: 'Close' })).toBeDisabled();
    expect(dialog.getByRole('button', { name: 'Stop ad' })).toBeDisabled();
  });
});

describe('LiveAdsPage', () => {
  it('says so when nothing is running', async () => {
    renderWithProviders(<LiveAdsPage />, { mocks: [] });
    expect(await screen.findByTestId('table-empty')).toHaveTextContent(
      'No ads are running right now.',
    );
  });

  // Stopping is not reversible — the confirm has to say so.
  it('stops an ad after confirming', async () => {
    __setTableRows([liveAd()]);
    renderWithProviders(<LiveAdsPage />, { mocks: [stopMock()] });
    fireEvent.click(await screen.findByRole('button', { name: 'Stop this ad' }));

    expect(await screen.findByText('Stop this ad?')).toBeInTheDocument();
    expect(screen.getByText(/cannot be restarted/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Stop ad' }));
    await waitFor(() =>
      expect(dialogsMock.notifySuccess).toHaveBeenCalledWith('“Diwali banner” stopped'),
    );
  });

  it('deletes an ad after confirming', async () => {
    __setTableRows([liveAd()]);
    renderWithProviders(<LiveAdsPage />, { mocks: [deleteMock()] });
    fireEvent.click(await screen.findByRole('button', { name: 'Delete this ad' }));

    expect(await screen.findByText('Delete this ad?')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));
    await waitFor(() =>
      expect(dialogsMock.notifySuccess).toHaveBeenCalledWith('“Diwali banner” deleted'),
    );
  });

  it('surfaces a failed stop instead of closing silently', async () => {
    __setTableRows([liveAd()]);
    renderWithProviders(<LiveAdsPage />, { mocks: [stopMock('ad1', 'still running')] });
    fireEvent.click(await screen.findByRole('button', { name: 'Stop this ad' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Stop ad' }));
    expect(await screen.findByText(/still running/)).toBeInTheDocument();
    expect(dialogsMock.notifySuccess).not.toHaveBeenCalled();
  });

  it('lets you back out of the confirm', async () => {
    __setTableRows([liveAd()]);
    renderWithProviders(<LiveAdsPage />, { mocks: [] });
    fireEvent.click(await screen.findByRole('button', { name: 'Stop this ad' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Cancel' }));
    await waitFor(() => expect(screen.queryByText('Stop this ad?')).not.toBeInTheDocument());
  });

  it('opens the details dialog from a row, and stops from there', async () => {
    __setTableRows([liveAd()]);
    renderWithProviders(<LiveAdsPage />, { mocks: [stopMock()] });
    fireEvent.click(await screen.findByText('rowclick-0'));

    const dialog = within(await screen.findByRole('dialog'));
    fireEvent.click(dialog.getByRole('button', { name: 'Stop ad' }));
    expect(await screen.findByText('Stop this ad?')).toBeInTheDocument();
  });

  it('closes the details dialog again', async () => {
    __setTableRows([liveAd()]);
    renderWithProviders(<LiveAdsPage />, { mocks: [] });
    fireEvent.click(await screen.findByText('rowclick-0'));

    const dialog = await screen.findByRole('dialog');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Close' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });
});
