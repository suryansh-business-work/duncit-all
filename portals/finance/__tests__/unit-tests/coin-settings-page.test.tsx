/**
 * Finance > Duncit Coin > Settings — every rule that decides how many coins
 * someone is given. The one-off grant card on the same page has its own suite
 * (coin-grant.test.tsx).
 */
import { beforeEach, describe, expect, it } from 'vitest';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import { CoinSettingsPage } from '../../src/pages/finance/duncit-coin';
import { notifySuccess } from './mocks/dialogs';
import { renderWithProviders } from '../testkit';
import {
  coinCurrencyMock,
  coinSettingsMock,
  makeCoinSettings,
  updateCoinSettingsMock,
} from '../mocks/coin.mock';

beforeEach(() => {
  notifySuccess.mockClear();
});

const field = (label: RegExp) => screen.getByLabelText(label) as HTMLInputElement;

describe('CoinSettingsPage', () => {
  it('shows a spinner until the saved rules load, then fills every field', async () => {
    renderWithProviders(<CoinSettingsPage />, { mocks: [coinSettingsMock(makeCoinSettings(), 20), coinCurrencyMock()] });
    expect(screen.getByRole('progressbar')).toBeInTheDocument();

    expect(await screen.findByRole('heading', { name: 'Coin Settings' })).toBeInTheDocument();
    await waitFor(() => expect(field(/^Pod join earn rate/).value).toBe('5'));
    expect(field(/^Shop earn rate/).value).toBe('3');
    expect(field(/^Coins per referral/).value).toBe('50');
    expect(field(/^Pod feedback rate/).value).toBe('10');
    expect(field(/^Coin expiry/).value).toBe('365');
    // Nothing edited yet, so there is nothing to save.
    expect(screen.getByRole('button', { name: 'Save settings' })).toBeDisabled();
  });

  it('saves the edited rules and says so', async () => {
    renderWithProviders(<CoinSettingsPage />, {
      mocks: [coinSettingsMock(), coinCurrencyMock(), updateCoinSettingsMock()],
    });
    await waitFor(() => expect(field(/^Shop earn rate/).value).toBe('3'));

    fireEvent.change(field(/^Shop earn rate/), { target: { value: '4' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save settings' }));
    await waitFor(() => expect(notifySuccess).toHaveBeenCalledWith('Coin settings saved'));
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('shows Saving… while the write is in flight', async () => {
    renderWithProviders(<CoinSettingsPage />, {
      mocks: [coinSettingsMock(), coinCurrencyMock(), updateCoinSettingsMock({ delay: 60_000 })],
    });
    await waitFor(() => expect(field(/^Coin expiry/).value).toBe('365'));

    fireEvent.change(field(/^Coin expiry/), { target: { value: '0' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save settings' }));
    expect(await screen.findByRole('button', { name: 'Saving…' })).toBeDisabled();
  });

  it('keeps an invalid rule from being sent, naming what is wrong', async () => {
    renderWithProviders(<CoinSettingsPage />, {
      mocks: [coinSettingsMock(), coinCurrencyMock(), updateCoinSettingsMock()],
    });
    await waitFor(() => expect(field(/^Pod join earn rate/).value).toBe('5'));

    fireEvent.change(field(/^Pod join earn rate/), { target: { value: '120' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save settings' }));
    expect(await screen.findByText('A rate cannot go above 100%.')).toBeInTheDocument();
    expect(notifySuccess).not.toHaveBeenCalled();
  });

  it('shows what the server refused above the cards', async () => {
    renderWithProviders(<CoinSettingsPage />, {
      mocks: [coinSettingsMock(), coinCurrencyMock(), updateCoinSettingsMock({ fail: true })],
    });
    await waitFor(() => expect(field(/^Pod feedback rate/).value).toBe('10'));

    fireEvent.change(field(/^Pod feedback rate/), { target: { value: '0' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save settings' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('A rate cannot go above 100%.');
    expect(notifySuccess).not.toHaveBeenCalled();
  });
});
