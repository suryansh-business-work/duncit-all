import { describe, expect, it, vi } from 'vitest';
import { screen, within } from '@testing-library/react';
import type { MockedResponse } from '@apollo/client/testing';
import { GraphQLError } from 'graphql';
import { renderWithProviders } from '../../testkit';
import { firstPageVariables } from '../table-stub';
import ChangeLogsSection from '../../../src/shared/change-logs';
import {
  ENTITY_CHANGE_FEED_TABLE,
  ENTITY_CHANGE_LOGS_TABLE,
  type EntityChangeLogRow,
} from '../../../src/shared/change-logs/queries';

vi.mock('@duncit/table', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@duncit/table')>();
  const stub = await import('../table-stub');
  return { ...actual, DuncitTable: stub.DuncitTable };
});

/**
 * One record's history, or — without an id — the whole console's feed. Both are
 * the same trail read through a different query, so what matters is which query
 * goes out, what it is scoped to, and whether the record column is shown.
 */
const CLUB_ADMIN_ID = '66f3c4d5e6f708192a3b4c5d';

const logRow = (over: Partial<EntityChangeLogRow> = {}) => ({
  __typename: 'EntityChangeLog',
  id: 'log-1',
  entity_type: 'CLUB_ADMIN',
  entity_id: CLUB_ADMIN_ID,
  entity_label: 'Kabir Sethi',
  field: 'commission_pct',
  field_label: 'Commission',
  old_value: '12',
  new_value: '15',
  action: 'UPDATE',
  actor_type: 'ADMIN',
  actor_user_id: '66d0b1c2d3e4f5a6b7c8d9e0',
  actor_name: 'Asha Rao',
  source: 'ADMIN_PORTAL',
  created_at: '2026-08-30T04:05:00.000Z',
  ...over,
});

const page = (rows: ReturnType<typeof logRow>[]) => ({
  __typename: 'EntityChangeLogTablePage',
  total: rows.length,
  page: 1,
  page_size: 25,
  rows,
});

const recordMock = (result: MockedResponse['result']): MockedResponse => ({
  request: {
    query: ENTITY_CHANGE_LOGS_TABLE,
    variables: {
      ...firstPageVariables('created_at'),
      entity_type: 'CLUB_ADMIN',
      entity_id: CLUB_ADMIN_ID,
    },
  },
  result,
});

describe('ChangeLogsSection', () => {
  it("reads ONE record's history, without the record column", async () => {
    renderWithProviders(
      <ChangeLogsSection entityType="CLUB_ADMIN" entityId={CLUB_ADMIN_ID} tableId="club-admins-console-change-logs" />,
      { mocks: [recordMock({ data: { entityChangeLogsTable: page([logRow()]) } })] },
    );

    expect(screen.getByText('Change logs')).toBeInTheDocument();
    expect(screen.getByTestId('duncit-table')).toHaveAttribute('data-table-id', 'club-admins-console-change-logs');
    expect(screen.getByTestId('duncit-table')).toHaveAttribute(
      'data-search-placeholder',
      'Search field, old or new value, or who changed it',
    );
    expect(screen.queryByTestId('col-entity_label')).not.toBeInTheDocument();

    const row = await screen.findByTestId('table-row');
    expect(within(row).getByTestId('value-field_label')).toHaveTextContent('Commission');
    expect(within(row).getByTestId('value-old_value')).toHaveTextContent('12');
    expect(within(row).getByTestId('value-new_value')).toHaveTextContent('15');
    expect(within(row).getByTestId('value-action')).toHaveTextContent('UPDATE');
    expect(within(row).getByTestId('value-actor_type')).toHaveTextContent('ADMIN');
    expect(within(row).getByTestId('value-actor_name')).toHaveTextContent('Asha Rao — 66d0b1c2d3e4f5a6b7c8d9e0');
    expect(within(row).getByTestId('value-source')).toHaveTextContent('ADMIN_PORTAL');
    expect(within(row).getByTestId('value-created_at').textContent).not.toBe('');
  });

  it('shows the empty copy when nothing was ever changed', async () => {
    renderWithProviders(
      <ChangeLogsSection entityType="CLUB_ADMIN" entityId={CLUB_ADMIN_ID} tableId="club-admins-console-change-logs" />,
      { mocks: [recordMock({ data: { entityChangeLogsTable: page([]) } })] },
    );

    expect(await screen.findByTestId('table-empty')).toHaveTextContent('No changes recorded yet.');
  });

  it('surfaces a refused history request', async () => {
    renderWithProviders(
      <ChangeLogsSection entityType="CLUB_ADMIN" entityId={CLUB_ADMIN_ID} tableId="club-admins-console-change-logs" />,
      { mocks: [recordMock({ errors: [new GraphQLError('Not allowed to read this trail')] })] },
    );

    expect(await screen.findByTestId('table-error')).toHaveTextContent('Not allowed to read this trail');
  });

  it("reads the console-wide feed without an id, naming each row's record", async () => {
    const feedMock: MockedResponse = {
      request: {
        query: ENTITY_CHANGE_FEED_TABLE,
        variables: { ...firstPageVariables('created_at'), entity_type: 'VENUE' },
      },
      result: {
        data: {
          entityChangeFeedTable: page([
            logRow({ entity_type: 'VENUE', entity_label: 'Third Wave Coffee, Indiranagar' }),
            logRow({ id: 'log-2', entity_type: 'VENUE', entity_id: '66f1a2b3c4d5e6f708192a3b', entity_label: '' }),
          ]),
        },
      },
    };
    renderWithProviders(<ChangeLogsSection entityType="VENUE" tableId="venues-console-change-feed" />, {
      mocks: [feedMock],
    });

    expect(screen.getByTestId('col-entity_label')).toHaveTextContent('Record');
    const [named, unnamed] = await screen.findAllByTestId('table-row');
    expect(within(named).getByTestId('value-entity_label')).toHaveTextContent('Third Wave Coffee, Indiranagar');
    // A record whose label was never stored still reads as a record: an em-dash
    // over the id rather than a blank headline.
    expect(within(unnamed).getByText('—')).toBeInTheDocument();
    expect(within(unnamed).getByText('66f1a2b3c4d5e6f708192a3b')).toBeInTheDocument();
  });
});
