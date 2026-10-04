import { describe, expect, it, vi } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import type { MockedResponse } from '@apollo/client/testing';
import { formatDateTime } from '@duncit/app-settings';
import { renderWithProviders } from '../../../__tests__/testkit';
import MembershipSubscribersPage from '../MembershipSubscribersPage';
import { SUBSCRIBERS_TABLE } from '../queries';

/** Grid stub with a fetch that round-trips through the suite's MockedProvider. */
vi.mock('@duncit/table', async (importOriginal) => {
  const stub = await import('../../location-subscriptions/__tests__/table-mock');
  return {
    ...(await importOriginal<typeof import('@duncit/table')>()),
    DuncitTable: stub.DuncitTable,
    useApolloTableFetch: stub.useApolloTableFetch,
  };
});

const subscriber = (id: string, email: string, name: string) => ({
  __typename: 'MembershipNewsSubscriber',
  id,
  user_id: `user-${id}`,
  email,
  name,
  created_at: '2026-08-01T10:30:00.000Z',
});

const tableMock = (rows: unknown[]): MockedResponse => ({
  request: { query: SUBSCRIBERS_TABLE, variables: () => true },
  maxUsageCount: Number.POSITIVE_INFINITY,
  result: {
    data: { membershipNewsSubscribersTable: { __typename: 'MembershipNewsSubscribersTablePage', total: rows.length, rows } },
  },
});

const rowOf = (email: string) =>
  screen.getAllByTestId('table-row').find((row) => within(row).queryAllByText(email).length > 0) as HTMLElement;

describe('MembershipSubscribersPage', () => {
  it('lists each subscriber with their name, or a dash when the profile has none, and when they signed up', async () => {
    renderWithProviders(<MembershipSubscribersPage />, {
      mocks: [tableMock([subscriber('s1', 'asha@duncit.com', 'Asha Rao'), subscriber('s2', 'anon@duncit.com', '')])],
    });
    await waitFor(() => expect(screen.getAllByTestId('table-row')).toHaveLength(2));

    expect(within(rowOf('Asha Rao')).getByTestId('value-name')).toHaveTextContent('Asha Rao');
    const anon = screen.getAllByTestId('table-row')[1];
    expect(within(anon).getByTestId('value-name')).toHaveTextContent('—');
    expect(within(anon).getByTestId('value-created_at')).toHaveTextContent(formatDateTime('2026-08-01T10:30:00.000Z'));
    expect(screen.getByTestId('col-created_at')).toHaveTextContent('Signed up');
  });

  it('says nobody has signed up when the list is empty', async () => {
    renderWithProviders(<MembershipSubscribersPage />, { mocks: [tableMock([])] });
    expect(await screen.findByTestId('table-empty')).toHaveTextContent('Nobody has signed up for membership news yet.');
    expect(screen.queryAllByTestId('table-row')).toHaveLength(0);
  });
});
