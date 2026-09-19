/**
 * Finance > Duncit Coin > Transactions — the full coin ledger, scoped to one
 * pod when the admin picks it (or arrives on a deep link naming it).
 */
import { beforeEach, describe, expect, it } from 'vitest';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import type { MockedResponse } from '@apollo/client/testing';
import { useLocation } from 'react-router';
import { CoinTransactionsPage } from '../../src/pages/finance/duncit-coin';
import { COIN_POD_PICKER } from '../../src/pages/finance/duncit-coin/queries';
import { resetTableControls, tableControls } from './mocks/table';
import { renderWithProviders } from '../testkit';
import {
  coinCurrencyMock,
  coinPodByIdMock,
  coinPodPickerMock,
  makeCoinTxn,
  makePodOption,
} from '../mocks/coin.mock';

/** Prints the query string the page is on, so a pod pick can be read back. */
function SearchProbe() {
  return <span data-testid="search-probe">{useLocation().search}</span>;
}

const Page = () => (
  <>
    <CoinTransactionsPage />
    <SearchProbe />
  </>
);

const mount = (mocks: MockedResponse[], entry = '/duncit-coin/transactions') =>
  renderWithProviders(<Page />, { path: '/duncit-coin/transactions', entry, mocks });

const podBox = () => screen.getByRole('combobox', { name: 'Pod' });

const ledgerRows = () => [
  makeCoinTxn(),
  makeCoinTxn({
    id: 'txn-2',
    user_name: '',
    user_email: '',
    type: 'DEBIT',
    amount: 40,
    balance_after: 105,
    source: 'PAYMENT_REDEEM',
    payment_id: 'pay_7c1',
    pods: [
      { id: 'pod-doc-1', title: 'Sunday Badminton', slug: 'sunday-badminton' },
      { id: 'pod-doc-2', title: 'Book Club', slug: 'book-club' },
      { id: 'pod-doc-3', title: 'Sunset Yoga', slug: 'sunset-yoga' },
    ],
  }),
  makeCoinTxn({
    id: 'txn-3',
    source: 'ADMIN_GRANT',
    admin_name: 'Finance Ops',
    reason: 'Goodwill for the rained-out pod',
    payment_id: null,
    payment_total: 0,
    pods: [],
  }),
];

beforeEach(() => {
  resetTableControls();
  tableControls.rowsByKey = { coinTransactionsTable: ledgerRows() };
});

const row = (id: number) => screen.getAllByTestId('table-row')[id];
const cell = (index: number, field: string) => within(row(index)).getByTestId(`cell-${field}`);

describe('CoinTransactionsPage — the ledger', () => {
  it('counts the rows and shows each movement the way the coins actually moved', async () => {
    mount([coinCurrencyMock(), coinPodPickerMock()]);
    expect(await screen.findByRole('heading', { name: 'Coin Transactions' })).toBeInTheDocument();
    await waitFor(() => expect(screen.getAllByTestId('table-row')).toHaveLength(3));
    expect(screen.getByText('3')).toBeInTheDocument();

    // A purchase reward on one pod.
    expect(cell(0, 'type')).toHaveTextContent('Earned');
    expect(cell(0, 'source')).toHaveTextContent('Purchase reward');
    expect(cell(0, 'amount')).toHaveTextContent('+25');
    expect(cell(0, 'user_name')).toHaveTextContent('Asha Raoasha@duncit.com');
    expect(cell(0, 'pods')).toHaveTextContent('Sunday Badmintonsunday-badminton');
    expect(cell(0, 'payment_total')).toHaveTextContent('₹500');
    expect(cell(0, 'reason')).toHaveTextContent('—');

    // A redemption from a cart spanning three pods, by an account with no name on file.
    expect(cell(1, 'type')).toHaveTextContent('Redeemed');
    expect(cell(1, 'amount')).toHaveTextContent('-40');
    expect(cell(1, 'user_name')).toHaveTextContent('u-1—');
    expect(cell(1, 'pods')).toHaveTextContent('sunday-badminton +2 more');

    // An admin grant: no payment, no pod.
    expect(cell(2, 'source')).toHaveTextContent('Admin grant');
    expect(cell(2, 'pods')).toHaveTextContent('—Not linked to a pod');
    expect(cell(2, 'payment_id')).toHaveTextContent('—');
    expect(cell(2, 'reason')).toHaveTextContent('Goodwill for the rained-out pod');
  });

  it('keeps the count on the newest search when an older one answers after it', async () => {
    tableControls.concurrent = true;
    tableControls.queries = [
      { ...tableControls.queries[0], search: 'pay_9' },
      { ...tableControls.queries[0], search: 'pay_9f2' },
    ];
    mount([coinCurrencyMock(), coinPodPickerMock()]);
    await waitFor(() => expect(screen.getAllByTestId('table-row')).toHaveLength(3));
    expect(screen.getByText('3')).toBeInTheDocument();
  });
});

describe('CoinTransactionsPage — the pod filter', () => {
  it('scopes the ledger to a picked pod and back to every pod', async () => {
    mount([coinCurrencyMock(), coinPodPickerMock()]);
    expect(podBox()).toHaveAttribute('placeholder', 'All pods — type to search');

    fireEvent.mouseDown(podBox());
    const listbox = await screen.findByRole('listbox');
    expect(within(listbox).getByText('smash-club / DUN-POD-4821')).toBeInTheDocument();
    fireEvent.click(within(listbox).getByRole('option', { name: /Sunday Badminton/ }));

    await waitFor(() => expect(screen.getByTestId('search-probe')).toHaveTextContent('?pod_id=pod-doc-1'));
    expect(podBox()).toHaveValue('Sunday Badminton');

    // MUI keeps the clear button visibility-hidden until the field is hovered.
    fireEvent.click(screen.getByRole('button', { name: 'Clear', hidden: true }));
    await waitFor(() => expect(screen.getByTestId('search-probe')).toHaveTextContent(/^$/));
    expect(podBox()).toHaveValue('');
  });

  it('names the pod a deep link arrived with once it has been looked up', async () => {
    mount([coinCurrencyMock(), coinPodPickerMock([]), coinPodByIdMock()], '/duncit-coin/transactions?pod_id=pod-doc-1');
    // Scoped, but not named yet: it must not claim to be showing every pod.
    expect(podBox()).toHaveAttribute('placeholder', 'Loading pod…');
    await waitFor(() => expect(podBox()).toHaveValue('Sunday Badminton'));
  });

  it('widens the search once the admin types', async () => {
    const searched: MockedResponse = {
      request: {
        query: COIN_POD_PICKER,
        variables: (vars: Record<string, { page_size?: number }>) => vars.query?.page_size === 25,
      },
      result: {
        data: {
          podsTable: {
            __typename: 'PodTablePage',
            rows: [makePodOption({ id: 'pod-doc-9', pod_id: 'DUN-POD-9001', pod_title: 'Morning Run', club_slug: 'run-club' })],
          },
        },
      },
      maxUsageCount: 10,
    };
    mount([coinCurrencyMock(), searched, coinPodPickerMock()]);

    fireEvent.change(podBox(), { target: { value: 'morn' } });
    expect(await screen.findByRole('option', { name: /Morning Run/ }, { timeout: 2000 })).toBeInTheDocument();
    expect(screen.getByText('run-club / DUN-POD-9001')).toBeInTheDocument();
  });
});
