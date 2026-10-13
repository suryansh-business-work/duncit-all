import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { renderWithProviders } from '../testkit';
import { mutation, ops, resetOps } from '../mocks/ops';

vi.mock('@apollo/client/react', async (io) => (await import('../mocks/ops')).apolloOpsFactory(io));
vi.mock('@duncit/dialogs', async (io) => (await import('../mocks/ops')).dialogsOpsFactory(io));

import GoogleAnalyticsPage from '../../src/pages/google-analytics';
import { tagStatus } from '../../src/pages/google-analytics/google-analytics-copy';

const site = (over: Record<string, unknown>) => ({
  __typename: 'GoogleAnalyticsSite',
  site: 'MAIN',
  measurement_id: null,
  enabled: false,
  updated_at: null,
  ...over,
});

const sites = [
  site({ site: 'MAIN', measurement_id: 'G-LIVE12345', enabled: true, updated_at: '2026-01-02T03:04:00.000Z' }),
  site({ site: 'PARTNERS', measurement_id: 'G-OFF123456', enabled: false }),
  site({ site: 'ADS', measurement_id: null, enabled: false }),
];

beforeEach(() => {
  resetOps();
  ops.q = { GoogleAnalyticsSites: { data: { googleAnalyticsSites: sites } } };
});

describe('tagStatus', () => {
  it('is NOT_SET without a measurement id, whatever the switch says', () => {
    expect(tagStatus(site({ measurement_id: null, enabled: true }) as never)).toBe('NOT_SET');
    expect(tagStatus(site({ measurement_id: '', enabled: true }) as never)).toBe('NOT_SET');
  });

  it('is LIVE when enabled and OFF when a tag is on file but switched off', () => {
    expect(tagStatus(site({ measurement_id: 'G-1', enabled: true }) as never)).toBe('LIVE');
    expect(tagStatus(site({ measurement_id: 'G-1', enabled: false }) as never)).toBe('OFF');
  });
});

describe('GoogleAnalyticsPage', () => {
  it('lists each website with its measurement id and tag status', async () => {
    renderWithProviders(<GoogleAnalyticsPage />);
    expect(await screen.findByText('G-LIVE12345')).toBeInTheDocument();
    expect(screen.getByText('G-OFF123456')).toBeInTheDocument();
    const live = screen.getByText('G-LIVE12345').closest('[role="row"]') as HTMLElement;
    expect(within(live).getByText('Live')).toBeInTheDocument();
    const off = screen.getByText('G-OFF123456').closest('[role="row"]') as HTMLElement;
    expect(within(off).getByText('Off')).toBeInTheDocument();
  });

  it('shows a loader before the first read and the error when it fails', () => {
    ops.q.GoogleAnalyticsSites = { loading: true };
    const first = renderWithProviders(<GoogleAnalyticsPage />);
    expect(screen.getByTestId('google-analytics-page')).toBeInTheDocument();
    expect(screen.queryByTestId('google-analytics-add')).not.toBeInTheDocument();
    first.unmount();

    ops.q.GoogleAnalyticsSites = { error: new Error('ga read failed') };
    renderWithProviders(<GoogleAnalyticsPage />);
    expect(screen.getByText('ga read failed')).toBeInTheDocument();
  });

  it('filters rows by measurement id from the search box', async () => {
    renderWithProviders(<GoogleAnalyticsPage />);
    await screen.findByText('G-LIVE12345');
    const search = screen.getAllByRole('textbox').find((el) => el.getAttribute('placeholder')?.toLowerCase().includes('search'));
    expect(search).toBeDefined();
    fireEvent.change(search as HTMLElement, { target: { value: 'OFF123' } });
    await waitFor(() => expect(screen.queryByText('G-LIVE12345')).not.toBeInTheDocument());
    expect(screen.getByText('G-OFF123456')).toBeInTheDocument();
  });

  it('offers only untagged websites when adding and saves the new tag', async () => {
    renderWithProviders(<GoogleAnalyticsPage />);
    fireEvent.click(await screen.findByTestId('google-analytics-add'));
    const dialog = await screen.findByTestId('google-analytics-dialog');
    expect(within(dialog).getByText('Add website tag')).toBeInTheDocument();

    const idField = within(dialog).getByTestId('google-analytics-site-measurement-id').querySelector('input') as HTMLInputElement;
    fireEvent.change(idField, { target: { value: 'G-NEWTAG123' } });
    fireEvent.submit(within(dialog).getByTestId('google-analytics-site-form'));

    const save = mutation('SaveGoogleAnalyticsSite');
    await waitFor(() => expect(save).toHaveBeenCalledTimes(1));
    expect(save.mock.calls[0][0].variables.input).toMatchObject({ site: 'ADS', measurement_id: 'G-NEWTAG123' });
    await waitFor(() => expect(screen.queryByTestId('google-analytics-dialog')).not.toBeInTheDocument());
    expect(ops.notifySuccess).toHaveBeenCalled();
  });

  it('disables Add when every website already has a tag', async () => {
    ops.q.GoogleAnalyticsSites = {
      data: { googleAnalyticsSites: sites.map((s) => ({ ...s, measurement_id: s.measurement_id ?? 'G-ALLSET1234' })) },
    };
    renderWithProviders(<GoogleAnalyticsPage />);
    expect(await screen.findByTestId('google-analytics-add')).toBeDisabled();
  });

  it('edits a tag with its website locked and shows a save failure in the form', async () => {
    mutation('SaveGoogleAnalyticsSite').mockRejectedValue(new Error('invalid measurement id'));
    renderWithProviders(<GoogleAnalyticsPage />);
    const row = (await screen.findByText('G-LIVE12345')).closest('[role="row"]') as HTMLElement;
    fireEvent.click(within(row).getByRole('button', { name: /edit/i }));
    const dialog = await screen.findByTestId('google-analytics-dialog');
    expect(within(dialog).getByText('Edit website tag')).toBeInTheDocument();
    fireEvent.submit(within(dialog).getByTestId('google-analytics-site-form'));
    expect(await within(dialog).findByTestId('google-analytics-site-error')).toHaveTextContent(
      'invalid measurement id',
    );
  });

  it('removes a tag after confirmation and tells the operator', async () => {
    ops.confirm.mockResolvedValue(true);
    renderWithProviders(<GoogleAnalyticsPage />);
    const row = (await screen.findByText('G-LIVE12345')).closest('[role="row"]') as HTMLElement;
    fireEvent.click(within(row).getByRole('button', { name: /delete|remove/i }));
    await waitFor(() => expect(mutation('DeleteGoogleAnalyticsSite')).toHaveBeenCalledTimes(1));
    expect(mutation('DeleteGoogleAnalyticsSite').mock.calls[0][0].variables).toEqual({ site: 'MAIN' });
    expect(ops.confirm.mock.calls[0][0]).toMatchObject({ destructive: true });
    expect(ops.notifySuccess).toHaveBeenCalled();
  });

  it('keeps the tag when the removal is declined, and cannot remove a website that has none', async () => {
    ops.confirm.mockResolvedValue(false);
    renderWithProviders(<GoogleAnalyticsPage />);
    await screen.findByText('G-LIVE12345');
    const rows = screen.getAllByRole('row');
    const adsRow = rows.find((r) => within(r).queryByText('Not set'));
    expect(adsRow).toBeDefined();
    expect(within(adsRow as HTMLElement).getByRole('button', { name: /delete|remove/i })).toBeDisabled();

    const liveRow = screen.getByText('G-LIVE12345').closest('[role="row"]') as HTMLElement;
    fireEvent.click(within(liveRow).getByRole('button', { name: /delete|remove/i }));
    await waitFor(() => expect(ops.confirm).toHaveBeenCalled());
    expect(mutation('DeleteGoogleAnalyticsSite')).not.toHaveBeenCalled();
  });

  it('reports a failed removal', async () => {
    ops.confirm.mockResolvedValue(true);
    mutation('DeleteGoogleAnalyticsSite').mockRejectedValue(new Error('cannot delete'));
    renderWithProviders(<GoogleAnalyticsPage />);
    const row = (await screen.findByText('G-LIVE12345')).closest('[role="row"]') as HTMLElement;
    fireEvent.click(within(row).getByRole('button', { name: /delete|remove/i }));
    await waitFor(() => expect(ops.notifyError).toHaveBeenCalledWith('cannot delete'));
  });
});
