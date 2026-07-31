import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { screen, fireEvent, waitFor, within } from '@testing-library/react';
import { renderWithProviders } from '../testkit';
import {
  campaignsForShortLinkMock,
  createShortLinkMock,
  deleteShortLinkMock,
  makeShortLinkRow,
  setShortLinkActiveMock,
  shortLinkOptionsMock,
  shortLinkQrMock,
} from '../mocks';
import { DuncitTable, __setTableRows, fetchRowsFrom } from './table-mock';

vi.mock('@duncit/table', () => import('./table-mock'));
vi.mock('@duncit/app-settings', () => ({
  useDateFormat: () => ({ formatDateTime: (d: Date | string) => `fmt:${String(d)}` }),
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
import ShortLinkDetailsDialog from '../../src/pages/short-links-page/ShortLinkDetailsDialog';
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

const pageMocks = () => [shortLinkOptionsMock(), campaignsForShortLinkMock(), shortLinkQrMock()];

beforeEach(() => {
  __setTableRows([]);
  clipboardMock.copyToClipboard.mockResolvedValue(true);
});
afterEach(() => {
  vi.clearAllMocks();
});

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
    renderWithProviders(
      <ShortLinksTableHarness rows={[makeShortLinkRow({ is_active: false })]} />,
    );
    const row = await screen.findByTestId('table-row');
    expect(within(row).getByTestId('cell-label')).toHaveTextContent('Diwali pod push');
    expect(within(row).getByTestId('cell-label')).toHaveTextContent('/aB3xY9Zq');
    expect(within(row).getByTestId('cell-is_active')).toHaveTextContent('Retired');
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
describe('ShortLinkDetailsDialog', () => {
  const render = (link: ShortLinkRow | null, props: Record<string, unknown> = {}, mocks = [shortLinkQrMock()]) =>
    renderWithProviders(
      <ShortLinkDetailsDialog
        link={link}
        busy={false}
        formatDateTime={String}
        onClose={vi.fn()}
        onToggleActive={vi.fn()}
        {...props}
      />,
      { mocks },
    );

  it('renders nothing until a link is opened', () => {
    const { container } = render(null, {}, []);
    expect(container).toBeEmptyDOMElement();
  });

  it('shows the short url, the QR and where it lands', async () => {
    render(makeShortLinkRow({ click_count: 42, utm_campaign: 'badminton_launch' }));
    expect(screen.getByText('https://duncit.com/aB3xY9Zq')).toBeInTheDocument();
    expect(screen.getByText('42')).toBeInTheDocument();
    expect(screen.getByText('badminton_launch')).toBeInTheDocument();
    expect(await screen.findByAltText('QR code for Diwali pod push')).toHaveAttribute(
      'src',
      'data:image/png;base64,QRQRQR',
    );
  });

  it('em-dashes a link nobody has clicked, and a link with no campaign', () => {
    render(makeShortLinkRow());
    expect(screen.getAllByText('—')).toHaveLength(3);
  });

  it('dates the first and last click once there have been some', () => {
    render(
      makeShortLinkRow({
        click_count: 5,
        first_clicked_at: '2026-07-31T09:00:00.000Z',
        last_clicked_at: '2026-07-31T18:30:00.000Z',
      }),
    );
    expect(screen.getByText('2026-07-31T09:00:00.000Z')).toBeInTheDocument();
    expect(screen.getByText('2026-07-31T18:30:00.000Z')).toBeInTheDocument();
    // Only utm_campaign is still blank.
    expect(screen.getAllByText('—')).toHaveLength(1);
  });

  it('waits on the QR rather than showing a broken image', () => {
    render(makeShortLinkRow(), {}, [shortLinkQrMock({ pending: true })]);
    expect(screen.queryByAltText('QR code for Diwali pod push')).not.toBeInTheDocument();
  });

  it('offers to retire an active link and revive a retired one', () => {
    const onToggleActive = vi.fn();
    render(makeShortLinkRow(), { onToggleActive });
    fireEvent.click(screen.getByRole('button', { name: 'Retire link' }));
    expect(onToggleActive).toHaveBeenCalled();

    render(makeShortLinkRow({ is_active: false }), { onToggleActive });
    expect(screen.getByRole('button', { name: 'Reactivate link' })).toBeInTheDocument();
  });

  it('locks every exit while a mutation is in flight', () => {
    render(makeShortLinkRow(), { busy: true });
    expect(screen.getByRole('button', { name: 'Close' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Retire link' })).toBeDisabled();
  });

  it('closes on demand', () => {
    const onClose = vi.fn();
    render(makeShortLinkRow(), { onClose });
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    expect(onClose).toHaveBeenCalled();
  });
});

// ===========================================================================
describe('ShortLinksPage', () => {
  it('says so when there are no links yet', async () => {
    renderWithProviders(<ShortLinksPage />, { mocks: pageMocks() });
    expect(await screen.findByTestId('table-empty')).toHaveTextContent('No short links yet');
  });

  it('creates a link and hands it straight back with its QR', async () => {
    renderWithProviders(<ShortLinksPage />, {
      mocks: [...pageMocks(), createShortLinkMock()],
    });
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

    // Straight into the details dialog, code and QR in hand.
    expect(await screen.findByText('https://duncit.com/aB3xY9Zq')).toBeInTheDocument();
  });

  it('asks what Other means before it will create the link', async () => {
    renderWithProviders(<ShortLinksPage />, { mocks: pageMocks() });
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

  it('surfaces a refused destination instead of failing silently', async () => {
    renderWithProviders(<ShortLinksPage />, {
      mocks: [
        ...pageMocks(),
        createShortLinkMock({}, { failWith: 'A duncit.com short link may only point at a Duncit site' }),
      ],
    });
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
    renderWithProviders(<ShortLinksPage />, { mocks: pageMocks() });
    fireEvent.click(await screen.findByRole('button', { name: 'New short link' }));
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    await waitFor(() =>
      expect(screen.queryByLabelText(/^Destination/)).not.toBeInTheDocument(),
    );
  });

  it('opens a link from a row click and retires it', async () => {
    __setTableRows([makeShortLinkRow()]);
    renderWithProviders(<ShortLinksPage />, {
      mocks: [...pageMocks(), setShortLinkActiveMock(false)],
    });
    fireEvent.click(await screen.findByText('rowclick-0'));
    fireEvent.click(await screen.findByRole('button', { name: 'Retire link' }));
    await waitFor(() =>
      expect(dialogsMock.notifySuccess).toHaveBeenCalledWith('“Diwali pod push” retired'),
    );
  });

  it('closes the details dialog again', async () => {
    __setTableRows([makeShortLinkRow()]);
    renderWithProviders(<ShortLinksPage />, { mocks: pageMocks() });
    fireEvent.click(await screen.findByText('rowclick-0'));

    const dialog = await screen.findByRole('dialog');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Close' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });

  it('asks what an Other medium means too', async () => {
    renderWithProviders(<ShortLinksPage />, { mocks: pageMocks() });
    fireEvent.click(await screen.findByRole('button', { name: 'New short link' }));
    fireEvent.mouseDown(screen.getByLabelText(/^Medium/));
    fireEvent.click(await screen.findByRole('option', { name: 'Other' }));
    expect(await screen.findByLabelText(/Which medium/)).toBeInTheDocument();
  });

  it('reactivates a retired link', async () => {
    __setTableRows([makeShortLinkRow({ is_active: false })]);
    renderWithProviders(<ShortLinksPage />, {
      mocks: [...pageMocks(), setShortLinkActiveMock(true)],
    });
    fireEvent.click(await screen.findByText('rowclick-0'));
    fireEvent.click(await screen.findByRole('button', { name: 'Reactivate link' }));
    await waitFor(() =>
      expect(dialogsMock.notifySuccess).toHaveBeenCalledWith('“Diwali pod push” reactivated'),
    );
  });

  // Deleting breaks anything already printed — the confirm has to say so.
  it('deletes a link after confirming, and warns what that costs', async () => {
    __setTableRows([makeShortLinkRow()]);
    renderWithProviders(<ShortLinksPage />, { mocks: [...pageMocks(), deleteShortLinkMock()] });
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
    renderWithProviders(<ShortLinksPage />, {
      mocks: [...pageMocks(), deleteShortLinkMock({ failWith: 'still referenced' })],
    });
    fireEvent.click(await screen.findByRole('button', { name: 'Delete link' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Delete' }));
    expect(await screen.findByText(/still referenced/)).toBeInTheDocument();
    expect(dialogsMock.notifySuccess).not.toHaveBeenCalled();
  });

  it('lets you back out of the delete confirm', async () => {
    __setTableRows([makeShortLinkRow()]);
    renderWithProviders(<ShortLinksPage />, { mocks: pageMocks() });
    fireEvent.click(await screen.findByRole('button', { name: 'Delete link' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Cancel' }));
    await waitFor(() =>
      expect(screen.queryByText('Delete this short link?')).not.toBeInTheDocument(),
    );
  });
});
