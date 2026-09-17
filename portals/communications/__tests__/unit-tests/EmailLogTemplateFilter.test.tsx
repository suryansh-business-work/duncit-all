import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, screen } from '@testing-library/react';
import type { MockedResponse } from '@apollo/client/testing';
import type { TableFilterValue } from '@duncit/table';
import { renderWithProviders } from '../testkit';
import {
  EMPTY_QUICK_FILTERS,
  quickFiltersToTable,
} from '../../src/pages/email-logs-page/EmailLogQuickFilters';
import { EMAIL_LOG_STATS } from '../../src/pages/email-logs-page/queries';

const m = vi.hoisted(() => ({ filters: [] as readonly TableFilterValue[] }));

vi.mock('@duncit/dialogs', () => ({ notify: vi.fn(), useConfirm: () => vi.fn() }));
vi.mock('@duncit/table', () => ({ useApolloTableFetch: () => vi.fn() }));
vi.mock('@duncit/user-context', () => ({ useUserData: () => ({ user: { roles: [] } }) }));
vi.mock('../../src/pages/email-logs-page/EmailLogDrawer', () => ({ default: () => null }));
vi.mock('../../src/pages/email-logs-page/EmailLogsTable', () => ({
  default: (p: { externalFilters: readonly TableFilterValue[] }) => {
    m.filters = p.externalFilters;
    return <div data-testid="logs-table" />;
  },
}));

import EmailLogsPage from '../../src/pages/email-logs-page';

/** The page's summary strip. Mocked so an unanswered query cannot look like a
 * failure of the filter this file is about. */
const statsMock: MockedResponse = {
  request: { query: EMAIL_LOG_STATS, variables: { days: 7 } },
  result: {
    data: {
      emailLogStats: {
        __typename: 'EmailLogStats',
        days: 7,
        sent: 120,
        skipped: 4,
        failed: 6,
        total: 130,
        all_time_total: 4210,
      },
    },
  },
};

const renderAt = (search: string) =>
  renderWithProviders(<EmailLogsPage />, {
    mocks: [statsMock],
    initialEntries: [`/emails/logs${search}`],
  });

beforeEach(() => {
  m.filters = [];
});

describe('quickFiltersToTable', () => {
  it('sends nothing when nothing is narrowed', () => {
    expect(quickFiltersToTable(EMPTY_QUICK_FILTERS)).toEqual([]);
  });

  it('matches a template slug exactly, so a prefix cannot drag in its neighbours', () => {
    expect(quickFiltersToTable({ status: '', source: '', template: 'pod-cancelled' })).toEqual([
      { field: 'template', op: 'eq', value: 'pod-cancelled' },
    ]);
  });

  it('carries status, source and template together', () => {
    expect(
      quickFiltersToTable({ status: 'FAILED', source: 'MWEB', template: 'welcome' })
    ).toEqual([
      { field: 'status', op: 'eq', value: 'FAILED' },
      { field: 'source', op: 'eq', value: 'MWEB' },
      { field: 'template', op: 'eq', value: 'welcome' },
    ]);
  });
});

describe('EmailLogsPage — arriving from a template send count', () => {
  it('applies ?template= and ?status= from the link the count opened', () => {
    renderAt('?template=welcome&status=SENT');
    expect(m.filters).toEqual([
      { field: 'status', op: 'eq', value: 'SENT' },
      { field: 'template', op: 'eq', value: 'welcome' },
    ]);
  });

  it('names the template it is narrowed to, so the short table is not mistaken for the whole log', () => {
    renderAt('?template=welcome');
    expect(screen.getByText('Template: welcome')).toBeInTheDocument();
  });

  it('drops the template filter when its chip is dismissed', () => {
    renderAt('?template=welcome&status=SENT');
    fireEvent.click(screen.getByTestId('CancelIcon'));
    expect(m.filters).toEqual([{ field: 'status', op: 'eq', value: 'SENT' }]);
    expect(screen.queryByText('Template: welcome')).not.toBeInTheDocument();
  });

  it('clears every filter — template included — from the All chip', () => {
    renderAt('?template=welcome&status=FAILED&source=CRM');
    fireEvent.click(screen.getByText('All'));
    expect(m.filters).toEqual([]);
  });

  it('keeps a status chip clickable while a template filter is on', () => {
    renderAt('?template=welcome');
    fireEvent.click(screen.getByText('Failed'));
    expect(m.filters).toEqual([
      { field: 'status', op: 'eq', value: 'FAILED' },
      { field: 'template', op: 'eq', value: 'welcome' },
    ]);
  });

  it('renders an unfiltered table when the URL carries nothing', () => {
    renderAt('');
    expect(m.filters).toEqual([]);
    expect(screen.getByTestId('logs-table')).toBeInTheDocument();
  });
});
