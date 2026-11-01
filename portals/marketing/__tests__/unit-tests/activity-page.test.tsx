import type { ComponentProps } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, within } from '@testing-library/react';
import { renderWithProviders } from '../testkit';
import { __setTableRows } from './table-mock';

/** The stand-in grid's props, plus the one the real grid pins a page's view through. */
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
const userCtx = vi.hoisted(() => ({ value: { user: { user_id: 'u1' } as { user_id?: string | null } | null } }));
vi.mock('@duncit/user-context', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@duncit/user-context')>()),
  useUserData: () => userCtx.value,
}));
vi.mock('@duncit/dialogs', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@duncit/dialogs')>()),
  useConfirm: () => vi.fn(),
}));

import ActivityPage from '../../src/pages/activity-page';

/** What the guide kit remembers for u1 once the Activity tour has been shown. */
const TOUR_SEEN = ['duncit.tours.completed.u1', '["marketing.activity"]'] as const;

beforeEach(() => {
  userCtx.value = { user: { user_id: 'u1' } };
});

afterEach(() => {
  __setTableRows([]);
  tableSpy.props = null;
  vi.clearAllMocks();
});

const renderPage = (path = '/activity') => renderWithProviders(<ActivityPage />, { initialEntries: [path] });

describe('ActivityPage', () => {
  it('opens with its heading, the intro and its steps, the legend and the unpinned grid', async () => {
    localStorage.setItem(...TOUR_SEEN);
    renderPage();
    expect(screen.getByRole('heading', { level: 1, name: 'Activity' })).toBeInTheDocument();
    expect(screen.getByText('Every automation and agent run, newest first.')).toBeInTheDocument();
    const intro = screen.getByTestId('page-intro');
    expect(within(intro).getByText(/The record of everything Marketing ran/)).toBeInTheDocument();
    expect(within(intro).getByText('Filter by type, status or who ran it, or search by name.')).toBeInTheDocument();
    expect(within(intro).getByText(/Open a row to see each step, the services it called/)).toBeInTheDocument();
    expect(screen.getByTestId('runs-legend')).toBeInTheDocument();
    expect(await screen.findByTestId('table-empty')).toHaveTextContent(
      'No runs yet. They appear here as soon as something is published, synced, searched or sent.',
    );
    expect(tableSpy.props).toMatchObject({ tableId: 'marketing-runs', externalFilters: [] });
    expect(screen.queryByTestId('portal-tour')).not.toBeInTheDocument();
  });

  it('pins the status, workflow and person the URL names', async () => {
    localStorage.setItem(...TOUR_SEEN);
    renderPage('/activity?status=AWAITING_APPROVAL&workflow=REEL&mine=1');
    await screen.findByTestId('table-empty');
    expect(tableSpy.props?.externalFilters).toEqual([
      { field: 'status', op: 'eq', value: 'AWAITING_APPROVAL' },
      { field: 'workflow', op: 'eq', value: 'REEL' },
      { field: 'actor_id', op: 'eq', value: 'u1' },
    ]);
  });

  it('waits rather than list everyone’s runs when "mine" is asked for before the person is known', () => {
    userCtx.value = { user: null };
    renderPage('/activity?mine=1');
    expect(screen.getByTestId('activity-waiting')).toBeInTheDocument();
    expect(screen.queryByTestId('duncit-table')).not.toBeInTheDocument();
    expect(screen.queryByTestId('runs-legend')).not.toBeInTheDocument();
  });

  it('walks a first-time visitor through the grid, the statuses and the details, then remembers', () => {
    renderPage();
    const card = screen.getByRole('dialog', { name: 'Every run, newest first' });
    expect(card).toHaveFocus();
    expect(card).toHaveAccessibleDescription('Search by name or narrow the list from the column menus. Nothing here is hidden from you.');
    expect(screen.getByText('Step 1 of 3')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    expect(screen.getByRole('dialog', { name: 'The status tells you what to do' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    expect(screen.getByRole('dialog', { name: 'Open a row for the full story' })).toBeInTheDocument();
    expect(screen.getByText('Step 3 of 3')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Done' }));
    expect(screen.queryByTestId('portal-tour')).not.toBeInTheDocument();
    expect(localStorage.getItem(TOUR_SEEN[0])).toBe(TOUR_SEEN[1]);
  });

  it('starts the tour again from the intro for someone who has seen it', () => {
    localStorage.setItem(...TOUR_SEEN);
    renderPage();
    expect(screen.queryByTestId('portal-tour')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Start tour' }));
    expect(screen.getByRole('dialog', { name: 'Every run, newest first' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Skip tour' }));
    expect(screen.queryByTestId('portal-tour')).not.toBeInTheDocument();
  });

  it('keeps the tour record per person, with a bucket for a visitor not yet known', () => {
    userCtx.value = { user: { user_id: null } };
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: 'Skip tour' }));
    expect(localStorage.getItem('duncit.tours.completed.anonymous')).toBe('["marketing.activity"]');
  });
});
