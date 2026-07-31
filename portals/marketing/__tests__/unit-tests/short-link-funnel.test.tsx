import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { screen, fireEvent, waitFor, within } from '@testing-library/react';
import { Route } from 'react-router-dom';
import { renderWithProviders } from '../testkit';
import {
  makeShortLinkFunnel,
  makeShortLinkJourneyRow,
  shortLinkFunnelMock,
  shortLinkMock,
  shortLinkQrMock,
  shortLinkStatsMock,
} from '../mocks';
import { __setTableRows } from './table-mock';

vi.mock('@duncit/table', () => import('./table-mock'));
vi.mock('@duncit/app-settings', () => ({
  useDateFormat: () => ({
    formatDateTime: (d: Date | string) => `fmt:${String(d)}`,
    formatDate: (d: Date | string) => `day:${String(d)}`,
  }),
}));
vi.mock('@duncit/dialogs', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@duncit/dialogs')>()),
  notifySuccess: vi.fn(),
}));
vi.mock('@duncit/utils', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@duncit/utils')>()),
  copyToClipboard: vi.fn().mockResolvedValue(true),
}));

import ShortLinkDetailPage from '../../src/pages/short-links-page/ShortLinkDetailPage';
import FunnelCard from '../../src/pages/short-links-page/detail/FunnelCard';
import JourneyTimelineDialog from '../../src/pages/short-links-page/detail/JourneyTimelineDialog';
import { getJourneyColumns } from '../../src/pages/short-links-page/detail/journeyColumns';
import { stepLabel, toFunnelRows } from '../../src/pages/short-links-page/detail/funnel-steps';
import type { ShortLinkJourneyRow } from '../../src/pages/short-links-page/queries';

const detailMocks = () => [
  shortLinkMock(),
  shortLinkStatsMock(),
  shortLinkQrMock(),
  shortLinkFunnelMock(),
];

const renderDetail = (mocks = detailMocks()) =>
  renderWithProviders(<ShortLinkDetailPage />, {
    mocks,
    initialEntries: ['/short-links/sl1'],
    routes: (
      <>
        <Route path="/short-links/:linkId" element={<ShortLinkDetailPage />} />
        <Route path="/short-links" element={<div>links-list</div>} />
      </>
    ),
  });

beforeEach(() => {
  __setTableRows([]);
});
afterEach(() => {
  vi.clearAllMocks();
});

// ===========================================================================
describe('toFunnelRows', () => {
  it('measures every step against the number who clicked', () => {
    const rows = toFunnelRows([
      { step: 'CLICKED', count: 40 },
      { step: 'LANDED', count: 30 },
      { step: 'PAID', count: 10 },
    ]);
    // Share of the top, not of the previous step — so the bars only ever
    // shorten and the picture reads as survival.
    expect(rows.map((row) => row.share)).toEqual([100, 75, 25]);
    expect(rows.map((row) => row.droppedFromPrevious)).toEqual([0, 10, 20]);
  });

  it('labels each step in words', () => {
    expect(toFunnelRows([{ step: 'CHECKOUT_STARTED', count: 1 }])[0].label).toBe('Reached checkout');
    expect(stepLabel('PAID')).toBe('Paid');
  });

  it('keeps an unknown step readable rather than blank', () => {
    expect(stepLabel('SOMETHING_NEW')).toBe('SOMETHING_NEW');
  });

  // Nothing to divide by when the link has never been clicked.
  it('reports zero share instead of dividing by zero', () => {
    const rows = toFunnelRows([
      { step: 'CLICKED', count: 0 },
      { step: 'PAID', count: 0 },
    ]);
    expect(rows.every((row) => row.share === 0)).toBe(true);
  });

  it('handles an empty funnel', () => {
    expect(toFunnelRows([])).toEqual([]);
  });
});

// ===========================================================================
describe('FunnelCard', () => {
  it('shows every step with its count, share and drop-off', () => {
    renderWithProviders(<FunnelCard funnel={makeShortLinkFunnel()} />);
    expect(screen.getAllByTestId('funnel-step')).toHaveLength(7);
    expect(screen.getByText('Clicked the link')).toBeInTheDocument();
    expect(screen.getByText('Reached checkout')).toBeInTheDocument();
    expect(screen.getByText('Paid')).toBeInTheDocument();
    // 5 of 40 clicks paid. The headline conversion rate and the PAID step's
    // share are the same number by definition — asserting both appear is what
    // catches the two ever disagreeing.
    expect(screen.getAllByText('12.5%')).toHaveLength(2);
    expect(screen.getByText('₹4,500')).toBeInTheDocument();
  });

  it('sizes each bar by its share of the clicks', () => {
    renderWithProviders(
      <FunnelCard
        funnel={makeShortLinkFunnel({
          steps: [
            { step: 'CLICKED', count: 10 },
            { step: 'PAID', count: 5 },
          ],
        })}
      />,
    );
    expect(
      screen.getAllByTestId('funnel-bar').map((bar) => bar.getAttribute('data-share')),
    ).toEqual(['100', '50']);
  });

  it('does not show a drop-off on the first step', () => {
    renderWithProviders(
      <FunnelCard
        funnel={makeShortLinkFunnel({
          steps: [
            { step: 'CLICKED', count: 10 },
            { step: 'LANDED', count: 4 },
          ],
        })}
      />,
    );
    expect(screen.getByText('−6')).toBeInTheDocument();
    expect(screen.queryByText('−0')).not.toBeInTheDocument();
  });
});

// ===========================================================================
describe('journey columns', () => {
  const value = (field: string, row: ShortLinkJourneyRow) =>
    getJourneyColumns().find((column) => column.field === field)?.valueGetter?.(row);

  it('reads the person, their furthest step and what they paid', () => {
    const row = makeShortLinkJourneyRow();
    expect(value('user_name', row)).toBe('Asha K');
    expect(value('furthest_step', row)).toBe('Paid');
    expect(String(value('converted_amount', row))).toContain('1,500');
    expect(value('country', row)).toBe('Pune, IN');
  });

  it('says so for a click that never signed in and never paid', () => {
    const row = makeShortLinkJourneyRow({
      user_id: null,
      user_name: null,
      user_email: null,
      converted_amount: null,
      furthest_step: 'CLICKED',
    });
    expect(value('user_name', row)).toBe('Not signed in');
    expect(value('converted_amount', row)).toBe('—');
    expect(value('furthest_step', row)).toBe('Clicked the link');
  });

  it('renders the visitor, and an unnamed account', async () => {
    __setTableRows([
      makeShortLinkJourneyRow(),
      makeShortLinkJourneyRow({ id: 'j2', user_name: null, user_email: null }),
      makeShortLinkJourneyRow({ id: 'j3', user_id: null, user_name: null, user_email: null }),
    ]);
    renderDetail();
    const rows = await screen.findAllByTestId('table-row');
    expect(within(rows[0]).getByTestId('cell-user_name')).toHaveTextContent('asha@example.com');
    expect(within(rows[1]).getByTestId('cell-user_name')).toHaveTextContent('Unnamed');
    expect(within(rows[2]).getByTestId('cell-user_name')).toHaveTextContent('Not signed in');
  });
});

// ===========================================================================
describe('JourneyTimelineDialog', () => {
  const render = (journey: ShortLinkJourneyRow | null) =>
    renderWithProviders(
      <JourneyTimelineDialog journey={journey} formatDateTime={String} onClose={vi.fn()} />,
    );

  it('renders nothing until a row is opened', () => {
    const { container } = render(null);
    expect(container).toBeEmptyDOMElement();
  });

  it('lists the steps in the order they happened', () => {
    render(makeShortLinkJourneyRow());
    const steps = screen.getAllByTestId('timeline-step');
    expect(steps).toHaveLength(3);
    expect(steps[0]).toHaveTextContent('Opened the app');
    expect(steps[2]).toHaveTextContent('Paid');
    expect(screen.getByText('asha@example.com')).toBeInTheDocument();
  });

  // A click with no trail means the redirect happened but the app never loaded.
  it('explains a click that never reported back', () => {
    render(
      makeShortLinkJourneyRow({
        steps: [],
        user_id: null,
        user_name: null,
        user_email: null,
        converted_amount: null,
      }),
    );
    expect(screen.getByText('Visitor who never signed in')).toBeInTheDocument();
    expect(screen.getByText(/never reported back/)).toBeInTheDocument();
    expect(screen.queryByTestId('timeline-step')).not.toBeInTheDocument();
  });

  it('closes on demand', () => {
    const onClose = vi.fn();
    renderWithProviders(
      <JourneyTimelineDialog
        journey={makeShortLinkJourneyRow()}
        formatDateTime={String}
        onClose={onClose}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    expect(onClose).toHaveBeenCalled();
  });
});

// ===========================================================================
describe('the funnel on the detail page', () => {
  it('shows the click-to-checkout funnel', async () => {
    renderDetail();
    expect(await screen.findByText('Click to checkout')).toBeInTheDocument();
    expect(screen.getAllByTestId('funnel-step')).toHaveLength(7);
  });

  it('opens one visitor timeline from the journey table', async () => {
    __setTableRows([makeShortLinkJourneyRow()]);
    renderDetail();
    fireEvent.click(await screen.findByText('rowclick-0'));

    const dialog = within(await screen.findByRole('dialog'));
    expect(dialog.getByText('Asha K')).toBeInTheDocument();
    expect(dialog.getAllByTestId('timeline-step')).toHaveLength(3);
  });

  it('closes the visitor timeline again', async () => {
    __setTableRows([makeShortLinkJourneyRow()]);
    renderDetail();
    fireEvent.click(await screen.findByText('rowclick-0'));

    const dialog = await screen.findByRole('dialog');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Close' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });

  // Reaching checkout and not paying is the row worth chasing, so it is
  // coloured differently from both a win and a plain drop-off.
  it('marks a visitor who reached checkout but did not pay', async () => {
    __setTableRows([
      makeShortLinkJourneyRow({ furthest_step: 'CHECKOUT_STARTED', converted_amount: null }),
    ]);
    renderDetail();
    const rows = await screen.findAllByTestId('table-row');
    expect(within(rows[0]).getByTestId('cell-furthest_step')).toHaveTextContent('Reached checkout');
  });

  it('waits on the funnel rather than drawing an empty one', () => {
    renderDetail([shortLinkMock(), shortLinkStatsMock(), shortLinkQrMock()]);
    expect(screen.queryByText('Click to checkout')).not.toBeInTheDocument();
  });
});
