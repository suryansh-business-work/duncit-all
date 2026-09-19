/**
 * The one-off coin movement for one named person. The account is picked from a
 * server search, never typed, and the reason is mandatory: this is the only
 * place coins appear with no payment or referral behind them.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import type { MockedResponse } from '@apollo/client/testing';
import CoinGrantCard from '../../src/pages/finance/duncit-coin/CoinGrantCard';
import { notifySuccess } from './mocks/dialogs';
import { renderWithProviders } from '../testkit';
import { adjustUserCoinsMock, coinUserSearchMock, makeCoinUser } from '../mocks/coin.mock';

beforeEach(() => {
  notifySuccess.mockClear();
});

const userBox = () => screen.getByRole('combobox', { name: /^User/ });

const mount = (mocks: MockedResponse[], onApplied = vi.fn()) => {
  renderWithProviders(<CoinGrantCard onApplied={onApplied} />, { mocks });
  return onApplied;
};

/** Types into the account search and picks the option once the server answers. */
const pickUser = async (term: string, optionName: RegExp) => {
  fireEvent.change(userBox(), { target: { value: term } });
  fireEvent.click(await screen.findByRole('option', { name: optionName }, { timeout: 2000 }));
};

const fillAdjustment = (coins: string, reason: string) => {
  fireEvent.change(screen.getByLabelText(/^Coins/), { target: { value: coins } });
  fireEvent.change(screen.getByLabelText(/^Reason/), { target: { value: reason } });
};

describe('CoinGrantCard', () => {
  it('will not apply an adjustment before an account is chosen', async () => {
    const onApplied = mount([]);
    fillAdjustment('50', 'Goodwill for the rained-out pod');
    fireEvent.click(screen.getByRole('button', { name: 'Apply adjustment' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Choose the account this applies to.');
    expect(onApplied).not.toHaveBeenCalled();
  });

  it('checks the coins and the reason before anything else', async () => {
    mount([]);
    fillAdjustment('0', 'no');
    fireEvent.click(screen.getByRole('button', { name: 'Apply adjustment' }));
    expect(await screen.findByText('Zero coins is not an adjustment.')).toBeInTheDocument();
    expect(
      screen.getByText('Say why — this is the only explanation the ledger will ever carry.'),
    ).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('grants coins to the picked account, then clears the card for the next one', async () => {
    const asha = makeCoinUser();
    const onApplied = mount([
      coinUserSearchMock('as', [asha, makeCoinUser({ id: 'u-2', full_name: '', email: 'ravi@duncit.com', balance: 0 })]),
      coinUserSearchMock('Asha Rao — asha@duncit.com', [asha]),
      adjustUserCoinsMock(),
    ]);

    fireEvent.change(userBox(), { target: { value: 'as' } });
    const listbox = await screen.findByRole('listbox', {}, { timeout: 2000 });
    // Each option carries its balance; a nameless account reads as its email.
    expect(within(listbox).getByText('asha@duncit.com · holds 120 coins')).toBeInTheDocument();
    expect(within(listbox).getByText('ravi@duncit.com')).toBeInTheDocument();
    fireEvent.click(within(listbox).getByRole('option', { name: /Asha Rao/ }));
    expect(userBox()).toHaveValue('Asha Rao — asha@duncit.com');

    fillAdjustment('50', 'Goodwill for the rained-out pod');
    fireEvent.click(screen.getByRole('button', { name: 'Apply adjustment' }));

    await waitFor(() => expect(notifySuccess).toHaveBeenCalledWith('Asha Rao now holds 170 coins'));
    expect(onApplied).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(userBox()).toHaveValue(''));
    expect(screen.getByLabelText(/^Coins/)).toHaveValue('');
  });

  it('names a nameless account by its email, and can deduct instead', async () => {
    const ravi = makeCoinUser({ id: 'u-2', full_name: '', email: 'ravi@duncit.com', balance: 80 });
    mount([
      coinUserSearchMock('ravi', [ravi]),
      coinUserSearchMock('ravi@duncit.com', [ravi]),
      adjustUserCoinsMock({ balance: 30 }),
    ]);

    await pickUser('ravi', /ravi@duncit.com/);
    expect(userBox()).toHaveValue('ravi@duncit.com');

    fireEvent.mouseDown(screen.getByRole('combobox', { name: 'Action' }));
    fireEvent.click(within(screen.getByRole('listbox')).getByRole('option', { name: 'Deduct coins' }));
    fillAdjustment('50', 'Duplicate referral reward');
    fireEvent.click(screen.getByRole('button', { name: 'Apply adjustment' }));

    await waitFor(() => expect(notifySuccess).toHaveBeenCalledWith('ravi@duncit.com now holds 30 coins'));
  });

  it('says when nobody matches, and asks for two characters before searching', async () => {
    mount([coinUserSearchMock('zz', [])]);
    fireEvent.focus(userBox());
    fireEvent.change(userBox(), { target: { value: 'z' } });
    expect(await screen.findByText('Type a name or email to search')).toBeInTheDocument();

    fireEvent.change(userBox(), { target: { value: 'zz' } });
    expect(await screen.findByText('No account matches that', {}, { timeout: 2000 })).toBeInTheDocument();
  });

  it('shows what the server refused and keeps the card as it was', async () => {
    const onApplied = mount([
      coinUserSearchMock('as'),
      coinUserSearchMock('Asha Rao — asha@duncit.com'),
      adjustUserCoinsMock({ fail: true }),
    ]);
    await pickUser('as', /Asha Rao/);
    fillAdjustment('500', 'Correction for a double grant');
    fireEvent.click(screen.getByRole('button', { name: 'Apply adjustment' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('A deduction cannot take a balance below zero.');
    expect(onApplied).not.toHaveBeenCalled();
    expect(userBox()).toHaveValue('Asha Rao — asha@duncit.com');
  });

  it('locks the card while the adjustment is applied', async () => {
    mount([
      coinUserSearchMock('as'),
      coinUserSearchMock('Asha Rao — asha@duncit.com'),
      adjustUserCoinsMock({ delay: 60_000 }),
    ]);
    await pickUser('as', /Asha Rao/);
    fillAdjustment('50', 'Goodwill for the rained-out pod');
    fireEvent.click(screen.getByRole('button', { name: 'Apply adjustment' }));
    expect(await screen.findByRole('button', { name: 'Applying…' })).toBeDisabled();
    expect(userBox()).toBeDisabled();
  });
});
