/**
 * Finance > Referrals — the message members share, the gift line, the coin
 * count it quotes (read-only here), and the log of every code redeemed.
 */
import { beforeEach, describe, expect, it } from 'vitest';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import ReferralsPage from '../../src/pages/finance/referrals-page';
import { notifySuccess } from './mocks/dialogs';
import { resetTableControls, tableControls } from './mocks/table';
import { renderWithProviders } from '../testkit';
import {
  makeReferralRow,
  makeReferralSettings,
  referralSettingsMock,
  updateReferralSettingsMock,
} from '../mocks/referrals.mock';

beforeEach(() => {
  resetTableControls();
  notifySuccess.mockClear();
  tableControls.rowsByKey = {
    referralsTable: [
      makeReferralRow(),
      // An account deleted since keeps its id on the log, but no name.
      makeReferralRow({ id: 'ref-2', code: 'DUN-8D2F0A', referrer_name: null, referred_name: null }),
    ],
  };
});

const message = () => screen.getByLabelText(/^Share message/) as HTMLTextAreaElement;

describe('ReferralsPage', () => {
  it('shows a spinner, then the settings, the live preview and the log', async () => {
    renderWithProviders(<ReferralsPage />, { mocks: [referralSettingsMock(makeReferralSettings(), 20)] });
    expect(screen.getByRole('progressbar')).toBeInTheDocument();

    expect(await screen.findByRole('heading', { name: 'Referrals' })).toBeInTheDocument();
    await waitFor(() =>
      expect(message().value).toBe('Join me on Duncit with {link} — we both get {coins} coins.'),
    );
    // The preview fills the placeholders with a sample code and the SAVED rate.
    expect(screen.getByText(/we both get 50 coins\./)).toHaveTextContent('/register?');
    expect(screen.getByText('50')).toBeInTheDocument();

    await waitFor(() => expect(screen.getAllByTestId('table-row')).toHaveLength(2));
    expect(screen.getByText('2')).toBeInTheDocument();
    const [named, anonymous] = screen.getAllByTestId('table-row');
    expect(within(named).getByTestId('cell-referrer')).toHaveTextContent('Asha Rao');
    expect(within(named).getByTestId('cell-referred')).toHaveTextContent('Ravi Kumar');
    expect(within(anonymous).getByTestId('cell-referrer')).toHaveTextContent('u-1');
    expect(within(anonymous).getByTestId('cell-referred')).toHaveTextContent('u-2');
    expect(within(anonymous).getByTestId('cell-code')).toHaveTextContent('DUN-8D2F0A');
  });

  it('re-renders the preview as the message is typed', async () => {
    renderWithProviders(<ReferralsPage />, { mocks: [referralSettingsMock()] });
    await waitFor(() => expect(message().value).not.toBe(''));
    fireEvent.change(message(), { target: { value: 'Code {code} gets you {coins} coins: {link}' } });
    expect(screen.getByText(/^Code DUN-9F3A2C gets you 50 coins: /)).toBeInTheDocument();
  });

  it('saves the edited copy and says so', async () => {
    renderWithProviders(<ReferralsPage />, { mocks: [referralSettingsMock(), updateReferralSettingsMock()] });
    await waitFor(() => expect(message().value).not.toBe(''));
    expect(screen.getByRole('button', { name: 'Save settings' })).toBeDisabled();

    fireEvent.change(screen.getByLabelText(/^Gift line/), { target: { value: 'A free coffee at your first pod.' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save settings' }));
    await waitFor(() => expect(notifySuccess).toHaveBeenCalledWith('Referral settings saved'));
  });

  it('shows Saving… while the write is in flight', async () => {
    renderWithProviders(<ReferralsPage />, {
      mocks: [referralSettingsMock(), updateReferralSettingsMock({ delay: 60_000 })],
    });
    await waitFor(() => expect(message().value).not.toBe(''));
    fireEvent.change(message(), { target: { value: '' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save settings' }));
    expect(await screen.findByRole('button', { name: 'Saving…' })).toBeDisabled();
  });

  it('refuses a message with no link in it', async () => {
    renderWithProviders(<ReferralsPage />, { mocks: [referralSettingsMock(), updateReferralSettingsMock()] });
    await waitFor(() => expect(message().value).not.toBe(''));
    fireEvent.change(message(), { target: { value: 'Join me on Duncit!' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save settings' }));
    expect(await screen.findByText(/^Include \{link\} so the message carries a signup link\./)).toBeInTheDocument();
    expect(notifySuccess).not.toHaveBeenCalled();
  });

  it('shows what the server refused', async () => {
    renderWithProviders(<ReferralsPage />, {
      mocks: [referralSettingsMock(), updateReferralSettingsMock({ fail: true })],
    });
    await waitFor(() => expect(message().value).not.toBe(''));
    fireEvent.change(screen.getByLabelText(/^Gift line/), { target: { value: '' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save settings' }));
    expect(await screen.findByText('The share message must carry {link}.')).toBeInTheDocument();
    expect(notifySuccess).not.toHaveBeenCalled();
  });
});
