/**
 * Finance > Gift Cards > Cards and > Logs — the card book (every card sold, who
 * bought it, who it was for, who converted it) and the insert-only ledger.
 */
import { beforeEach, describe, expect, it } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import { GiftCardCardsPage, GiftCardLogsPage } from '../../src/pages/finance/gift-cards';
import { displayStatus } from '../../src/pages/finance/gift-cards/cells';
import { resetTableControls, tableControls } from './mocks/table';
import { renderWithProviders } from '../testkit';
import { giftCardCurrencyMock, makeGiftCardRow, makeGiftCardTxn } from '../mocks/gift-card.mock';

beforeEach(() => {
  resetTableControls();
});

const cell = (index: number, field: string) =>
  within(screen.getAllByTestId('table-row')[index]).getByTestId(`cell-${field}`);

describe('gift card status', () => {
  it('reads a redeemed or stored-expired card as such, and a lapsed active one as expired', () => {
    expect(displayStatus(makeGiftCardRow({ status: 'REDEEMED' }))).toBe('REDEEMED');
    expect(displayStatus(makeGiftCardRow({ status: 'EXPIRED' }))).toBe('EXPIRED');
    expect(displayStatus(makeGiftCardRow({ expires_at: '2020-01-01T00:00:00.000Z' }))).toBe('EXPIRED');
    expect(displayStatus(makeGiftCardRow())).toBe('ACTIVE');
  });
});

describe('GiftCardCardsPage', () => {
  it('counts the book and shows each card with its people and status', async () => {
    tableControls.rowsByKey = {
      giftCardsTable: [
        makeGiftCardRow(),
        makeGiftCardRow({
          id: 'gc-2',
          code: 'DUN-GC-9K1M',
          // The SHOP theme snapshots no category name; the client names it.
          scope_type: 'SHOP',
          scope_category_id: null,
          scope_name: '',
          status: 'REDEEMED',
          redeemed: true,
          redeemed_at: '2026-08-05T10:00:00.000Z',
          recipient_name: '',
          recipient_email: '',
          redeemer_name: 'Ravi Kumar',
          redeemer_email: 'ravi@duncit.com',
          payment_id: '',
        }),
      ],
    };
    renderWithProviders(<GiftCardCardsPage />, { mocks: [giftCardCurrencyMock()] });

    expect(await screen.findByRole('heading', { name: 'Gift Cards — Cards' })).toBeInTheDocument();
    await waitFor(() => expect(screen.getAllByTestId('table-row')).toHaveLength(2));
    expect(screen.getByText('2')).toBeInTheDocument();

    expect(cell(0, 'code')).toHaveTextContent('DUN-GC-7Q2X');
    expect(cell(0, 'scope_name')).toHaveTextContent('SportsCATEGORY');
    expect(cell(0, 'initial_amount')).toHaveTextContent('₹1,500');
    expect(cell(0, 'status')).toHaveTextContent('Active');
    expect(cell(0, 'purchaser_name')).toHaveTextContent('Asha Raoasha@duncit.com');
    expect(cell(0, 'recipient_name')).toHaveTextContent('Meerameera@duncit.com');
    // Not converted yet: nobody redeemed it.
    expect(cell(0, 'redeemer_name')).toHaveTextContent('——');
    expect(cell(0, 'payment_id')).toHaveTextContent('pay_gc_1');

    expect(cell(1, 'scope_name')).toHaveTextContent('Pod ShopSHOP');
    expect(cell(1, 'status')).toHaveTextContent('Redeemed');
    expect(cell(1, 'recipient_name')).toHaveTextContent('——');
    expect(cell(1, 'redeemer_name')).toHaveTextContent('Ravi Kumarravi@duncit.com');
    expect(cell(1, 'payment_id')).toHaveTextContent('—');
  });

  it('keeps the count on the newest search when an older one answers after it', async () => {
    tableControls.rowsByKey = { giftCardsTable: [makeGiftCardRow()] };
    tableControls.concurrent = true;
    tableControls.queries = [
      { ...tableControls.queries[0], search: 'DUN' },
      { ...tableControls.queries[0], search: 'DUN-GC' },
    ];
    renderWithProviders(<GiftCardCardsPage />, { mocks: [giftCardCurrencyMock()] });
    await waitFor(() => expect(screen.getAllByTestId('table-row')).toHaveLength(1));
    expect(screen.getByText('1')).toBeInTheDocument();
  });

  it('says so when no card has been sold', async () => {
    renderWithProviders(<GiftCardCardsPage />, { mocks: [giftCardCurrencyMock()] });
    expect(await screen.findByText('No gift cards sold yet.')).toBeInTheDocument();
  });
});

describe('GiftCardLogsPage', () => {
  it('shows each issue and conversion, and who it was for', async () => {
    tableControls.rowsByKey = {
      giftCardTransactionsTable: [
        makeGiftCardTxn(),
        makeGiftCardTxn({
          id: 'gct-2',
          user_id: 'u-9',
          user_name: '',
          user_email: '',
          type: 'REDEEM',
          amount: 1500,
          balance_after: 0,
          source: 'REDEEM_TO_COINS',
          payment_id: null,
        }),
      ],
    };
    renderWithProviders(<GiftCardLogsPage />, { mocks: [giftCardCurrencyMock()] });

    expect(await screen.findByRole('heading', { name: 'Gift Cards — Logs' })).toBeInTheDocument();
    await waitFor(() => expect(screen.getAllByTestId('table-row')).toHaveLength(2));

    expect(cell(0, 'type')).toHaveTextContent('Issued');
    expect(cell(0, 'user_name')).toHaveTextContent('Asha Raoasha@duncit.com');
    expect(cell(0, 'amount')).toHaveTextContent('₹1,500');
    expect(cell(0, 'source')).toHaveTextContent('PURCHASE');
    expect(cell(0, 'payment_id')).toHaveTextContent('pay_gc_1');

    expect(cell(1, 'type')).toHaveTextContent('Redeemed');
    expect(cell(1, 'user_name')).toHaveTextContent('——');
    expect(cell(1, 'balance_after')).toHaveTextContent('₹0');
    expect(cell(1, 'payment_id')).toHaveTextContent('—');
  });

  it('keeps the count on the newest search when an older one answers after it', async () => {
    tableControls.rowsByKey = { giftCardTransactionsTable: [makeGiftCardTxn()] };
    tableControls.concurrent = true;
    tableControls.queries = [
      { ...tableControls.queries[0], search: 'pay' },
      { ...tableControls.queries[0], search: 'pay_gc' },
    ];
    renderWithProviders(<GiftCardLogsPage />, { mocks: [giftCardCurrencyMock()] });
    await waitFor(() => expect(screen.getAllByTestId('table-row')).toHaveLength(1));
    expect(screen.getByText('1')).toBeInTheDocument();
  });
});
