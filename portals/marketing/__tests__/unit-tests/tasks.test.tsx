import type { ComponentProps } from 'react';
import type { MockedResponse } from '@apollo/client/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, within } from '@testing-library/react';
import { renderWithProviders } from '../testkit';
import { __setTableRows } from './table-mock';
import { makeRunDetail, makeRunRow, makeRunSummary, marketingRunMock, marketingRunSummaryMock } from '../mocks';

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

import TasksPage from '../../src/pages/tasks-page';

beforeEach(() => {
  userCtx.value = { user: { user_id: 'u1' } };
  localStorage.setItem('duncit.tours.completed.u1', '["marketing.tasks"]');
});

afterEach(() => {
  __setTableRows([]);
  tableSpy.props = null;
  vi.clearAllMocks();
});

const renderPage = (extra: MockedResponse[] = []) =>
  renderWithProviders(<TasksPage />, {
    mocks: [marketingRunSummaryMock(makeRunSummary()), ...extra],
    initialEntries: ['/tasks'],
  });

describe('TasksPage', () => {
  it('opens with its heading and intro, and leads from each card to the list it counts', async () => {
    renderPage();
    expect(screen.getByRole('heading', { level: 1, name: 'My Tasks' })).toBeInTheDocument();
    expect(screen.getByText('What is waiting on you, and your own runs still in flight.')).toBeInTheDocument();
    expect(screen.getByText(/Your personal queue: approvals that need you/)).toBeInTheDocument();
    expect(screen.getByText('Pick a card to jump to the full list it counts.')).toBeInTheDocument();

    const cards = screen.getByTestId('run-summary-cards');
    expect(await within(cards).findByText('3')).toBeInTheDocument();
    expect(within(cards).getByRole('link', { name: /Approvals waiting/ })).toHaveAttribute('href', '/approvals');
    const mine = within(cards).getByRole('link', { name: /My runs in flight/ });
    expect(mine).toHaveAttribute('href', '/activity?mine=1');
    expect(within(mine).getByText('1')).toBeInTheDocument();
    const failed = within(cards).getByRole('link', { name: /Failed this week/ });
    expect(failed).toHaveAttribute('href', '/activity?status=FAILED');
    expect(within(failed).getByText('5')).toBeInTheDocument();
  });

  it('lists only the signed-in person’s unfinished runs, and says so when there are none', async () => {
    renderPage();
    expect(await screen.findByTestId('table-empty')).toHaveTextContent(
      'Nothing waiting on you. New approvals and follow-ups will appear here.',
    );
    expect(tableSpy.props).toMatchObject({
      tableId: 'marketing-tasks',
      externalFilters: [
        { field: 'actor_id', op: 'eq', value: 'u1' },
        { field: 'status', op: 'in', values: ['PENDING', 'RUNNING', 'AWAITING_APPROVAL'] },
      ],
    });
  });

  it('shows the person’s runs and opens one from the grid', async () => {
    __setTableRows([makeRunRow({ status: 'AWAITING_APPROVAL' })]);
    renderPage([marketingRunMock(makeRunDetail({ status: 'AWAITING_APPROVAL' }))]);
    const row = await screen.findByTestId('table-row');
    expect(within(row).getByTestId('cell-status')).toHaveTextContent('Needs approval');
    fireEvent.click(within(row).getByRole('button', { name: 'rowclick-0' }));
    const drawer = await screen.findByTestId('marketing-run-drawer');
    expect(await within(drawer).findByRole('heading', { level: 3, name: 'Your decision' })).toBeInTheDocument();
  });

  it('waits for the signed-in person before listing anything, since the list is theirs', () => {
    userCtx.value = { user: null };
    renderPage();
    expect(screen.getByTestId('tasks-waiting')).toBeInTheDocument();
    expect(screen.queryByTestId('duncit-table')).not.toBeInTheDocument();
    expect(screen.getByTestId('run-summary-cards')).toBeInTheDocument();
  });
});
