import type { ComponentProps } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { renderWithProviders } from '../testkit';
import { __setTableRows } from './table-mock';
import { leadSummaryErrorMock, leadSummaryMock, makeLeadRow, makeLeadSummary, marketingLeadMock, makeLeadDetail } from '../mocks';

/** The stand-in grid's props, plus the ones the page pins and decorates the view through. */
type TableProps = ComponentProps<typeof import('./table-mock').DuncitTable> & { externalFilters?: ReadonlyArray<unknown> };
const tableSpy = vi.hoisted(() => ({ props: null as TableProps | null }));
vi.mock('@duncit/table', async () => {
  const mock = await import('./table-mock');
  const DuncitTable = (props: TableProps) => {
    tableSpy.props = props;
    return <mock.DuncitTable {...props} />;
  };
  return { ...mock, DuncitTable };
});
const userCtx = vi.hoisted(() => ({ value: { user: { user_id: 'u1', roles: ['MARKETING_MANAGER'] } as { user_id?: string | null; roles?: string[] } | null } }));
vi.mock('@duncit/user-context', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@duncit/user-context')>()),
  useUserData: () => userCtx.value,
}));
vi.mock('@duncit/app-settings', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@duncit/app-settings')>()),
  useDateFormat: () => ({ formatDateTime: (d: Date | string) => `fmt:${String(d)}` }),
}));

import LeadsPage from '../../src/pages/leads-page';
import LeadSummaryCards from '../../src/pages/leads-page/LeadSummaryCards';

/** What the guide kit remembers for u1 once the Leads tour has been shown. */
const TOUR_SEEN = ['duncit.tours.completed.u1', '["marketing.leads"]'] as const;

beforeEach(() => {
  userCtx.value = { user: { user_id: 'u1', roles: ['MARKETING_MANAGER'] } };
});

afterEach(() => {
  __setTableRows([]);
  tableSpy.props = null;
  vi.clearAllMocks();
});

const renderPage = (path = '/leads', mocks = [leadSummaryMock(makeLeadSummary())]) =>
  renderWithProviders(<LeadsPage />, { initialEntries: [path], mocks });

describe('LeadsPage', () => {
  it('opens with its heading, the intro, the stage cards, the two ways to add leads and the unpinned grid', async () => {
    localStorage.setItem(...TOUR_SEEN);
    renderPage();
    expect(screen.getByRole('heading', { level: 1, name: 'All leads' })).toBeInTheDocument();
    expect(screen.getByText('Every lead from every source, in one pipeline.')).toBeInTheDocument();
    const intro = screen.getByTestId('page-intro');
    expect(within(intro).getByText(/One list of everyone Marketing is talking to/)).toBeInTheDocument();
    expect(within(intro).getByText(/Open a lead to move its stage/)).toBeInTheDocument();
    expect(within(intro).getByText(/Promote a qualified lead to the CRM/)).toBeInTheDocument();
    expect(await screen.findByTestId('table-empty')).toHaveTextContent('No leads yet. Add one, import a file, or run an Instagram search.');
    expect(tableSpy.props).toMatchObject({ tableId: 'marketing-leads', externalFilters: [], searchPlaceholder: 'Search by name, company, contact, website, handle or city' });
    await waitFor(() => expect(screen.getByTestId('lead-card-ALL')).toHaveTextContent('12'));
    expect(screen.getByTestId('lead-card-NEW')).toHaveTextContent('5');
    expect(screen.getByTestId('lead-card-QUALIFIED')).toHaveTextContent('2');
    expect(screen.getByTestId('lead-card-LOST')).toHaveTextContent('0');
    expect(screen.getByTestId('lead-card-QUALIFIED').querySelector('a')).toHaveAttribute('href', '/leads?stage=QUALIFIED');
    expect(screen.getByTestId('lead-card-ALL').querySelector('a')).toHaveAttribute('href', '/leads');
    expect(screen.getByRole('button', { name: 'New lead' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Import CSV' })).toBeInTheDocument();
    expect(screen.queryByTestId('portal-tour')).not.toBeInTheDocument();
  });

  it('pins the stage and pipeline the URL names', async () => {
    localStorage.setItem(...TOUR_SEEN);
    renderPage('/leads?stage=QUALIFIED&pipeline=VENUE&other=x');
    await screen.findByTestId('table-empty');
    expect(tableSpy.props?.externalFilters).toEqual([
      { field: 'stage', op: 'eq', value: 'QUALIFIED' },
      { field: 'pipeline', op: 'eq', value: 'VENUE' },
    ]);
  });

  it('opens the New lead and Import dialogs from the toolbar, and a row opens its drawer', async () => {
    localStorage.setItem(...TOUR_SEEN);
    const lead = makeLeadDetail();
    __setTableRows([makeLeadRow()]);
    renderPage('/leads', [leadSummaryMock(makeLeadSummary()), marketingLeadMock(lead)]);
    fireEvent.click(screen.getByRole('button', { name: 'New lead' }));
    expect(screen.getByRole('dialog', { name: 'New lead' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'New lead' })).not.toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: 'Import CSV' }));
    expect(screen.getByRole('dialog', { name: 'Import leads from a CSV' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Import leads from a CSV' })).not.toBeInTheDocument());

    fireEvent.click(await screen.findByRole('button', { name: 'rowclick-0' }));
    expect(await screen.findByRole('heading', { level: 2, name: 'Blue Cafe' })).toBeInTheDocument();
    expect(screen.getByTestId('lead-contacts')).toHaveTextContent('hi@bluecafe.in');
  });

  it('walks a first-time visitor through the cards, the grid and the actions, then remembers', () => {
    renderPage();
    const card = screen.getByRole('dialog', { name: 'Where the pipeline stands' });
    expect(card).toHaveFocus();
    expect(screen.getByText('Step 1 of 3')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    expect(screen.getByRole('dialog', { name: 'Every lead, newest first' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    expect(screen.getByRole('dialog', { name: 'Add leads two ways' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Done' }));
    expect(screen.queryByTestId('portal-tour')).not.toBeInTheDocument();
    expect(localStorage.getItem(TOUR_SEEN[0])).toBe(TOUR_SEEN[1]);
  });
});

describe('LeadSummaryCards', () => {
  it('shows a dash while loading, then the counts, and hands back a reload', async () => {
    const refetchRef = { current: null as (() => void) | null };
    renderWithProviders(<LeadSummaryCards refetchRef={refetchRef} />, { mocks: [leadSummaryMock(makeLeadSummary({ total: 3 }))] });
    expect(screen.getByTestId('lead-card-ALL')).toBeInTheDocument();
    await waitFor(() => expect(screen.getByTestId('lead-card-ALL')).toHaveTextContent('3'));
    expect(refetchRef.current).toEqual(expect.any(Function));
    refetchRef.current?.();
    await waitFor(() => expect(screen.getByTestId('lead-card-ALL')).toHaveTextContent('3'));
  });

  it('says when the counts could not be read', async () => {
    renderWithProviders(<LeadSummaryCards />, { mocks: [leadSummaryErrorMock('Counts unavailable')] });
    expect(await screen.findByRole('alert')).toHaveTextContent('Counts unavailable');
    expect(screen.getByTestId('lead-card-NEW')).toHaveTextContent('—');
  });
});
