/**
 * Finance > Withdrawals > Withdrawal Settings — one minimum withdrawable balance
 * per partner role, each saved on its own so an edit to one never rewrites the
 * other three.
 */
import { beforeEach, describe, expect, it } from 'vitest';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { WithdrawalSettingsPage } from '../../src/pages/finance/withdrawals-page';
import {
  toFormValues,
  withdrawalMinimumsSchema,
} from '../../src/pages/finance/withdrawals-page/withdrawal-minimums.schema';
import { notifySuccess } from './mocks/dialogs';
import { renderWithProviders } from '../testkit';
import {
  makeWithdrawalMinimums,
  updateWithdrawalMinimumsMock,
  withdrawalMinimumsMock,
} from '../mocks/withdrawals.mock';

beforeEach(() => {
  notifySuccess.mockClear();
});

/** The card for one role, found by its heading. */
const card = (label: string) =>
  screen.getByRole('heading', { name: label }).closest('.MuiCard-root') as HTMLElement;

const amountIn = (label: string) =>
  within(card(label)).getByRole('textbox', { name: /Minimum Withdrawal Amount/ });

describe('withdrawal minimums schema', () => {
  it('turns the saved floors into form strings', () => {
    expect(toFormValues(makeWithdrawalMinimums())).toEqual({
      host: '1000',
      venue_owner: '2500',
      ecomm_manager: '1500',
      club_admin: '500',
    });
  });

  it('wants whole rupees, present, and under the ceiling', () => {
    const messages = (host: string) => {
      const parsed = withdrawalMinimumsSchema.safeParse({ ...toFormValues(makeWithdrawalMinimums()), host });
      return parsed.success ? [] : parsed.error.issues.map((issue) => issue.message);
    };
    expect(messages('2000')).toEqual([]);
    expect(messages('')).toContain('Enter a minimum amount.');
    expect(messages('99.5')).toEqual(['Whole rupees only — digits, no decimals or symbols.']);
    expect(messages('1000001')).toEqual(['Keep the floor at or under 10,00,000.']);
  });
});

describe('WithdrawalSettingsPage', () => {
  it('shows a spinner until the floors load, then one card per role in the configured currency', async () => {
    renderWithProviders(<WithdrawalSettingsPage />, { mocks: [withdrawalMinimumsMock(makeWithdrawalMinimums(), 20)] });
    expect(screen.getByRole('progressbar')).toBeInTheDocument();

    expect(await screen.findByRole('heading', { name: 'Withdrawal Settings' })).toBeInTheDocument();
    await waitFor(() => expect(amountIn('Venue Owner')).toHaveValue('2500'));
    expect(amountIn('Host')).toHaveValue('1000');
    expect(amountIn('E-Commerce Brand')).toHaveValue('1500');
    expect(amountIn('Club Admin')).toHaveValue('500');
    expect(within(card('Host')).getByText('₹')).toBeInTheDocument();
    expect(
      within(card('Club Admin')).getByText('The club admin cut taken off each pod in their club.'),
    ).toBeInTheDocument();
    // Nothing is edited yet, so nothing can be saved.
    for (const button of screen.getAllByRole('button', { name: 'Save' })) {
      expect(button).toBeDisabled();
    }
  });

  it('saves only the role that was edited, taking the server’s answer as the new value', async () => {
    renderWithProviders(<WithdrawalSettingsPage />, {
      mocks: [withdrawalMinimumsMock(), updateWithdrawalMinimumsMock({ saved: { host: 1200 } })],
    });
    await waitFor(() => expect(amountIn('Host')).toHaveValue('1000'));

    fireEvent.change(amountIn('Host'), { target: { value: '1200' } });
    fireEvent.change(amountIn('Club Admin'), { target: { value: '750' } });
    const save = within(card('Host')).getByRole('button', { name: 'Save' });
    expect(save).toBeEnabled();
    fireEvent.click(save);

    await waitFor(() => expect(notifySuccess).toHaveBeenCalledWith('Host minimum saved'));
    // Host is clean again; the Club Admin edit in progress was left alone.
    await waitFor(() => expect(within(card('Host')).getByRole('button', { name: 'Save' })).toBeDisabled());
    expect(amountIn('Club Admin')).toHaveValue('750');
    expect(within(card('Club Admin')).getByRole('button', { name: 'Save' })).toBeEnabled();
  });

  it('refuses to save an invalid floor and says why under the field', async () => {
    renderWithProviders(<WithdrawalSettingsPage />, {
      mocks: [withdrawalMinimumsMock(), updateWithdrawalMinimumsMock()],
    });
    await waitFor(() => expect(amountIn('Venue Owner')).toHaveValue('2500'));

    fireEvent.change(amountIn('Venue Owner'), { target: { value: '25.5' } });
    fireEvent.click(within(card('Venue Owner')).getByRole('button', { name: 'Save' }));

    expect(
      await within(card('Venue Owner')).findByText('Whole rupees only — digits, no decimals or symbols.'),
    ).toBeInTheDocument();
    expect(notifySuccess).not.toHaveBeenCalled();
  });

  it('shows the server’s refusal above the cards', async () => {
    renderWithProviders(<WithdrawalSettingsPage />, {
      mocks: [withdrawalMinimumsMock(), updateWithdrawalMinimumsMock({ fail: true })],
    });
    await waitFor(() => expect(amountIn('E-Commerce Brand')).toHaveValue('1500'));

    fireEvent.change(amountIn('E-Commerce Brand'), { target: { value: '1800' } });
    fireEvent.click(within(card('E-Commerce Brand')).getByRole('button', { name: 'Save' }));

    expect(await screen.findByText('minimum rejected')).toBeInTheDocument();
    expect(notifySuccess).not.toHaveBeenCalled();
  });
});
