import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import { Route } from 'react-router-dom';
import { renderWithProviders } from '../testkit';
import {
  campaignsForShortLinkMock,
  createShortLinkMock,
  deleteShortLinkMock,
  makeShortLinkRow,
  shortLinkOptionsMock,
} from '../mocks';
import { DuncitTable, __setTableRows, fetchRowsFrom } from './table-mock';

vi.mock('@duncit/table', () => import('./table-mock'));
vi.mock('@duncit/app-settings', () => ({
  useDateFormat: () => ({
    formatDateTime: (d: Date | string) => `fmt:${String(d)}`,
    formatDate: (d: Date | string) => `day:${String(d)}`,
  }),
}));
const dialogsMock = vi.hoisted(() => ({ notifySuccess: vi.fn() }));
vi.mock('@duncit/dialogs', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@duncit/dialogs')>()),
  notifySuccess: dialogsMock.notifySuccess,
}));
const clipboardMock = vi.hoisted(() => ({ copyToClipboard: vi.fn() }));
vi.mock('@duncit/utils', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@duncit/utils')>()),
  copyToClipboard: clipboardMock.copyToClipboard,
}));

import ShortLinksPage from '../../src/pages/short-links-page/ShortLinksPage';
import CopyableUrl from '../../src/pages/short-links-page/CopyableUrl';
import { getShortLinkColumns } from '../../src/pages/short-links-page/columns';
import type { ShortLinkOption, ShortLinkRow } from '../../src/pages/short-links-page/queries';

const SOURCES: ShortLinkOption[] = [
  { value: 'INSTAGRAM', label: 'Instagram', utm_value: 'instagram', requires_text: false },
  { value: 'OTHER', label: 'Other', utm_value: '', requires_text: true },
];
const MEDIUMS: ShortLinkOption[] = [
  { value: 'SOCIAL', label: 'Social', utm_value: 'social', requires_text: false },
  { value: 'OTHER', label: 'Other', utm_value: '', requires_text: true },
];

const pageMocks = () => [shortLinkOptionsMock(), campaignsForShortLinkMock()];

/** The list page behind its route, with the detail route stubbed so opening a
 * link lands somewhere observable. */
const renderPage = (mocks = pageMocks()) =>
  renderWithProviders(<ShortLinksPage />, {
    mocks,
    initialEntries: ['/short-links'],
    routes: (
      <>
        <Route path="/short-links" element={<ShortLinksPage />} />
        <Route path="/short-links/:linkId" element={<div>link-detail</div>} />
      </>
    ),
  });

beforeEach(() => {
  __setTableRows([]);
  clipboardMock.copyToClipboard.mockResolvedValue(true);
});
afterEach(() => {
  vi.clearAllMocks();
});

/** The columns rendered through the shared table mock. */
function ShortLinksTableHarness({
  rows,
  onView = vi.fn(),
  onDelete = vi.fn(),
}: Readonly<{
  rows: ShortLinkRow[];
  onView?: (row: ShortLinkRow) => void;
  onDelete?: (row: ShortLinkRow) => void;
}>) {
  return (
    <DuncitTable
      columns={getShortLinkColumns({ sources: SOURCES, mediums: MEDIUMS, onView, onDelete })}
      fetchRows={fetchRowsFrom(rows)}
      getRowId={(row: ShortLinkRow) => row.id}
    />
  );
}

// ===========================================================================
describe('short link columns', () => {
  const cols = () =>
    getShortLinkColumns({
      sources: SOURCES,
      mediums: MEDIUMS,
      onView: vi.fn(),
      onDelete: vi.fn(),
    });
  const value = (field: string, row: ShortLinkRow) =>
    cols().find((column) => column.field === field)?.valueGetter?.(row);

  it('reads the sortable value off each column', () => {
    const row = makeShortLinkRow({ utm_campaign: 'badminton_launch' });
    expect(value('label', row)).toBe('Diwali pod push');
    expect(value('source', row)).toBe('Instagram');
    expect(value('medium', row)).toBe('Social');
    expect(value('utm_campaign', row)).toBe('badminton_launch');
    expect(value('is_active', row)).toBe('Active');
  });

  // "Other" on its own tells a marketer nothing — the free text is the answer.
  it('shows the free text a link was made for, not the word Other', () => {
    const row = makeShortLinkRow({
      source: 'OTHER',
      source_other: 'Campus Ambassador',
      medium: 'OTHER',
      medium_other: 'Print Flyer',
    });
    expect(value('source', row)).toBe('Campus Ambassador');
    expect(value('medium', row)).toBe('Print Flyer');
  });

  it('falls back to the stored value when an option is unknown, and em-dashes no campaign', () => {
    const row = makeShortLinkRow({ source: 'RETIRED_CHANNEL', medium: 'OTHER', medium_other: null });
    expect(value('source', row)).toBe('RETIRED_CHANNEL');
    expect(value('medium', row)).toBe('Other');
    expect(value('utm_campaign', row)).toBe('—');
  });

  it('renders the label with its code and the retired state', async () => {
    renderWithProviders(<ShortLinksTableHarness rows={[makeShortLinkRow({ is_active: false })]} />);
    const row = await screen.findByTestId('table-row');
    expect(row).toHaveTextContent('Diwali pod push');
    expect(row).toHaveTextContent('/aB3xY9Zq');
    expect(row).toHaveTextContent('Retired');
  });

  it('opens and deletes a row from its actions', async () => {
    const onView = vi.fn();
    const onDelete = vi.fn();
    renderWithProviders(
      <ShortLinksTableHarness rows={[makeShortLinkRow()]} onView={onView} onDelete={onDelete} />,
    );
    fireEvent.click(await screen.findByRole('button', { name: 'Open link details' }));
    expect(onView).toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Delete link' }));
    expect(onDelete).toHaveBeenCalled();
  });
});

// ===========================================================================
describe('CopyableUrl', () => {
  it('copies the link and says so', async () => {
    renderWithProviders(<CopyableUrl url="https://duncit.com/aB3xY9Zq" label="Share this" />);
    expect(screen.getByText('Share this')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Copy link' }));
    expect(clipboardMock.copyToClipboard).toHaveBeenCalledWith('https://duncit.com/aB3xY9Zq');
    expect(await screen.findByRole('button', { name: 'Copied' })).toBeInTheDocument();
  });

  // Claiming "Copied" for a copy that never happened is worse than saying so.
  it('admits when the clipboard refused', async () => {
    clipboardMock.copyToClipboard.mockResolvedValue(false);
    renderWithProviders(<CopyableUrl url="https://duncit.com/aB3xY9Zq" />);
    fireEvent.click(screen.getByRole('button', { name: 'Copy link' }));
    expect(await screen.findByRole('button', { name: /Could not copy/ })).toBeInTheDocument();
  });

  it('admits when the clipboard call throws outright', async () => {
    clipboardMock.copyToClipboard.mockRejectedValue(new Error('blocked'));
    renderWithProviders(<CopyableUrl url="https://duncit.com/aB3xY9Zq" />);
    fireEvent.click(screen.getByRole('button', { name: 'Copy link' }));
    expect(await screen.findByRole('button', { name: /Could not copy/ })).toBeInTheDocument();
  });
});

// ===========================================================================
describe('ShortLinksPage', () => {
  it('says so when there are no links yet', async () => {
    renderPage();
    expect(await screen.findByTestId('table-empty')).toHaveTextContent('No short links yet');
  });

  it('creates a link and goes straight to its detail page', async () => {
    renderPage([...pageMocks(), createShortLinkMock()]);
    fireEvent.click(await screen.findByRole('button', { name: 'New short link' }));

    fireEvent.change(screen.getByLabelText(/^Label/), { target: { value: 'Diwali pod push' } });
    fireEvent.change(screen.getByLabelText(/^Destination/), {
      target: { value: 'https://mweb.duncit.com/club/c1/pod/p1' },
    });
    fireEvent.mouseDown(screen.getByLabelText(/Link creating for/));
    fireEvent.click(await screen.findByRole('option', { name: 'Instagram' }));
    fireEvent.mouseDown(screen.getByLabelText(/^Medium/));
    fireEvent.click(await screen.findByRole('option', { name: 'Social' }));

    await waitFor(() => expect(screen.getByRole('button', { name: 'Create link' })).toBeEnabled());
    fireEvent.click(screen.getByRole('button', { name: 'Create link' }));

    expect(await screen.findByText('link-detail')).toBeInTheDocument();
  });

  it('asks what Other means before it will create the link', async () => {
    renderPage();
    fireEvent.click(await screen.findByRole('button', { name: 'New short link' }));

    fireEvent.change(screen.getByLabelText(/^Label/), { target: { value: 'Poster run' } });
    fireEvent.change(screen.getByLabelText(/^Destination/), {
      target: { value: 'https://mweb.duncit.com/shop' },
    });
    fireEvent.mouseDown(screen.getByLabelText(/Link creating for/));
    fireEvent.click(await screen.findByRole('option', { name: 'Other' }));

    expect(await screen.findByLabelText(/Which channel/)).toBeInTheDocument();
    await waitFor(() => expect(screen.getByRole('button', { name: 'Create link' })).toBeDisabled());
  });

  it('asks what an Other medium means too', async () => {
    renderPage();
    fireEvent.click(await screen.findByRole('button', { name: 'New short link' }));
    fireEvent.mouseDown(screen.getByLabelText(/^Medium/));
    fireEvent.click(await screen.findByRole('option', { name: 'Other' }));
    expect(await screen.findByLabelText(/Which medium/)).toBeInTheDocument();
  });

  it('surfaces a refused destination instead of failing silently', async () => {
    renderPage([
      ...pageMocks(),
      createShortLinkMock({}, { failWith: 'A duncit.com short link may only point at a Duncit site' }),
    ]);
    fireEvent.click(await screen.findByRole('button', { name: 'New short link' }));
    fireEvent.change(screen.getByLabelText(/^Label/), { target: { value: 'Diwali pod push' } });
    fireEvent.change(screen.getByLabelText(/^Destination/), {
      target: { value: 'https://mweb.duncit.com/shop' },
    });
    fireEvent.mouseDown(screen.getByLabelText(/Link creating for/));
    fireEvent.click(await screen.findByRole('option', { name: 'Instagram' }));
    fireEvent.mouseDown(screen.getByLabelText(/^Medium/));
    fireEvent.click(await screen.findByRole('option', { name: 'Social' }));
    await waitFor(() => expect(screen.getByRole('button', { name: 'Create link' })).toBeEnabled());
    fireEvent.click(screen.getByRole('button', { name: 'Create link' }));

    expect(await screen.findByText(/may only point at a Duncit site/)).toBeInTheDocument();
  });

  it('backs out of creating without making anything', async () => {
    renderPage();
    fireEvent.click(await screen.findByRole('button', { name: 'New short link' }));
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    await waitFor(() => expect(screen.queryByLabelText(/^Destination/)).not.toBeInTheDocument());
  });

  it('opens a link from a row click', async () => {
    __setTableRows([makeShortLinkRow()]);
    renderPage();
    fireEvent.click(await screen.findByText('rowclick-0'));
    expect(await screen.findByText('link-detail')).toBeInTheDocument();
  });

  // Deleting breaks anything already printed — the confirm has to say so.
  it('deletes a link after confirming, and warns what that costs', async () => {
    __setTableRows([makeShortLinkRow()]);
    renderPage([...pageMocks(), deleteShortLinkMock()]);
    fireEvent.click(await screen.findByRole('button', { name: 'Delete link' }));

    expect(await screen.findByText('Delete this short link?')).toBeInTheDocument();
    expect(screen.getByText(/already printed or posted will 404/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));
    await waitFor(() =>
      expect(dialogsMock.notifySuccess).toHaveBeenCalledWith('“Diwali pod push” deleted'),
    );
  });

  it('surfaces a failed delete instead of closing silently', async () => {
    __setTableRows([makeShortLinkRow()]);
    renderPage([...pageMocks(), deleteShortLinkMock({ failWith: 'still referenced' })]);
    fireEvent.click(await screen.findByRole('button', { name: 'Delete link' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Delete' }));
    expect(await screen.findByText(/still referenced/)).toBeInTheDocument();
    expect(dialogsMock.notifySuccess).not.toHaveBeenCalled();
  });

  it('lets you back out of the delete confirm', async () => {
    __setTableRows([makeShortLinkRow()]);
    renderPage();
    fireEvent.click(await screen.findByRole('button', { name: 'Delete link' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Cancel' }));
    await waitFor(() =>
      expect(screen.queryByText('Delete this short link?')).not.toBeInTheDocument(),
    );
  });
});
