/**
 * Loyalty > Gift Card Settings — the amounts policy (min can never exceed max)
 * and the delivery policy (a fee before printed cards switch on).
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import GiftCardSettingsPage from '../../src/pages/gift-cards/settings/GiftCardSettingsPage';
import { toDeliverySettings } from '../../src/pages/gift-cards/settings/queries';
import { giftCardSettingsSchema } from '../../src/pages/gift-cards/virtual/gift-card-settings.schema';
import { notifyError, notifySuccess } from './mocks/dialogs';
import { resetUserContext, userContextControls } from './mocks/user-context';
import { renderWithProviders } from '../testkit';
import {
  deliverySettingsErrorMock,
  deliverySettingsMock,
  makeDeliverySettings,
  updateDeliveryErrorMock,
  updateDeliveryMock,
} from '../mocks/gift-card-order.mock';
import { giftCardSettingsMock } from '../mocks/gift-card.mock';

beforeEach(() => {
  resetUserContext();
  vi.mocked(notifySuccess).mockClear();
  vi.mocked(notifyError).mockClear();
});

const asWriter = () => {
  userContextControls.user = { roles: ['LOYALTY_MANAGER'] };
};

describe('giftCardSettingsSchema — amount bounds', () => {
  const t = (key: string) => key;
  const errorsOf = (min_amount: string, max_amount: string) => {
    const r = giftCardSettingsSchema(t).safeParse({ denominations: '500', min_amount, max_amount, validity_months: '12' });
    return r.success ? {} : Object.fromEntries(r.error.issues.map((i) => [i.path.join('.'), i.message]));
  };

  it('refuses a maximum below the minimum, and accepts equal bounds', () => {
    expect(errorsOf('5000', '1000')).toEqual({ max_amount: 'finance.giftCards.maxBelowMin' });
    expect(errorsOf('1000', '1000')).toEqual({});
  });

  it('reports only the field rule while a bound is not a number yet', () => {
    expect(errorsOf('', '1000')).toEqual({ min_amount: 'finance.giftCards.minAmountLabel' });
    expect(errorsOf('100', 'x')).toEqual({ max_amount: 'finance.giftCards.maxAmountLabel' });
  });
});

describe('toDeliverySettings', () => {
  it('is null until both halves load', () => {
    expect(toDeliverySettings(undefined)).toBeNull();
  });
});

describe('GiftCardSettingsPage', () => {
  it('saves the delivery policy', async () => {
    asWriter();
    renderWithProviders(<GiftCardSettingsPage />, {
      mocks: [deliverySettingsMock(), giftCardSettingsMock(), updateDeliveryMock(makeDeliverySettings({ max_quantity: 5 }))],
    });
    expect(await screen.findByRole('heading', { name: 'Gift Card Settings' })).toBeInTheDocument();
    const max = await screen.findByLabelText('Most cards per order');
    await waitFor(() => expect(max).toHaveValue('10'));
    fireEvent.change(max, { target: { value: '5' } });
    fireEvent.click(screen.getByTestId('delivery-settings-save'));
    await waitFor(() => expect(notifySuccess).toHaveBeenCalledWith('Delivery settings saved'));
  });

  it('shows the server’s rule when a save is refused, or its own words', async () => {
    asWriter();
    const settings = makeDeliverySettings();
    renderWithProviders(<GiftCardSettingsPage />, {
      mocks: [
        deliverySettingsMock(settings),
        giftCardSettingsMock(),
        updateDeliveryErrorMock(settings, 'Set a delivery fee before switching on physical gift cards'),
        { request: updateDeliveryMock(settings).request, error: new Error('') },
      ],
    });
    await waitFor(() => expect(screen.getByLabelText('Most cards per order')).toHaveValue('10'));
    fireEvent.click(screen.getByTestId('delivery-settings-save'));
    await waitFor(() => expect(notifyError).toHaveBeenCalledWith('Set a delivery fee before switching on physical gift cards'));
    fireEvent.click(screen.getByTestId('delivery-settings-save'));
    await waitFor(() => expect(notifyError).toHaveBeenCalledWith('The settings could not be saved. Please try again.'));
  });

  it('says so when the delivery policy cannot load, and shows a read-only seat no save', async () => {
    renderWithProviders(<GiftCardSettingsPage />, { mocks: [deliverySettingsErrorMock(), giftCardSettingsMock()] });
    expect(await screen.findByText('The delivery settings could not be loaded.')).toBeInTheDocument();
    expect(screen.queryByTestId('delivery-settings-save')).toBeNull();
  });
});
