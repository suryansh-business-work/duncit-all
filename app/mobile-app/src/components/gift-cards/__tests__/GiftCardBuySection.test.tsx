import { fireEvent, screen, waitFor } from '@testing-library/react-native';

import { GiftCardBuySection } from '@/components/gift-cards/GiftCardBuySection';
import type { GiftCardStorefront } from '@/hooks/useGiftCards';
import { fallbackT } from '@/i18n/fallback';
import { renderWithProviders } from '@/utils/test-utils';

const design = {
  id: 'd1',
  name: 'Classic',
  front_image_url: 'https://img/f.png',
  back_image_url: 'https://img/b.png',
};
const storefront = (
  over: Partial<GiftCardStorefront> = {},
  settings: Record<string, unknown> = {},
): GiftCardStorefront =>
  ({
    design,
    settings: {
      denominations: [500, 1000],
      min_amount: 100,
      max_amount: 5000,
      validity_months: 12,
      max_quantity: 5,
      physical_enabled: true,
      shipping_fee: 99,
      updated_at: '',
      ...settings,
    },
    physical_available: 3,
    currency_symbol: '₹',
    ...over,
  }) as GiftCardStorefront;

const mount = (s = storefront()) => {
  const onContinue = jest.fn();
  renderWithProviders(
    <GiftCardBuySection storefront={s} design={design} onContinue={onContinue} />,
  );
  return onContinue;
};

describe('GiftCardBuySection', () => {
  it('starts on the first preset and continues with one emailed card of the default design', async () => {
    const onContinue = mount();
    expect(screen.getByTestId('gift-card-total-value')).toHaveTextContent('₹500.00');
    fireEvent.press(screen.getByTestId('gift-card-continue'));
    await waitFor(() =>
      expect(onContinue).toHaveBeenCalledWith({
        design_id: 'd1',
        design_name: 'Classic',
        front_url: 'https://img/f.png',
        back_url: 'https://img/b.png',
        amount: 500,
        quantity: 1,
        delivery_mode: 'DIGITAL',
        shipping_fee: 0,
        gift: false,
        recipient_email: '',
        recipient_name: '',
        message: '',
      }),
    );
  });

  it('counts cards up to the policy maximum and refuses more', async () => {
    const onContinue = mount();
    fireEvent.press(screen.getByTestId('gift-card-quantity-plus'));
    fireEvent.press(screen.getByTestId('gift-card-quantity-plus'));
    expect(screen.getByTestId('gift-card-total-value')).toHaveTextContent('₹1500.00');
    fireEvent.changeText(screen.getByTestId('gift-card-quantity-input'), '9');
    expect(
      await screen.findByText(fallbackT('mweb.giftCards.quantityRange', { vars: { max: 5 } })),
    ).toBeOnTheScreen();
    fireEvent.press(screen.getByTestId('gift-card-continue'));
    expect(onContinue).not.toHaveBeenCalled();
  });

  it('sends printed cards with the delivery fee once and the recipient name, no inbox', async () => {
    const onContinue = mount();
    fireEvent.press(screen.getByTestId('gift-card-delivery-physical'));
    fireEvent.press(screen.getByTestId('gift-card-quantity-plus'));
    expect(screen.getByTestId('gift-card-total-delivery-value')).toHaveTextContent('₹99.00');
    expect(screen.getByTestId('gift-card-total-value')).toHaveTextContent('₹1099.00');
    fireEvent.changeText(screen.getByTestId('gift-card-recipient-name-input'), ' Priya ');
    fireEvent.press(screen.getByTestId('gift-card-continue'));
    await waitFor(() =>
      expect(onContinue).toHaveBeenCalledWith(
        expect.objectContaining({
          delivery_mode: 'PHYSICAL',
          quantity: 2,
          shipping_fee: 99,
          recipient_email: '',
          recipient_name: 'Priya',
        }),
      ),
    );
  });

  it('offers no printed option while printed cards are out of stock', () => {
    mount(storefront({ physical_available: 0 }));
    expect(screen.queryByTestId('gift-card-delivery-physical')).toBeNull();
    expect(screen.getByTestId('gift-card-delivery-caption')).toHaveTextContent(
      fallbackT('mweb.giftCards.physicalUnavailable'),
    );
  });

  it('refuses an amount outside the policy and a gift without a valid email', async () => {
    const onContinue = mount();
    fireEvent.changeText(screen.getByTestId('gift-card-custom-amount-input'), '50');
    fireEvent.press(screen.getByTestId('gift-card-continue'));
    expect(onContinue).not.toHaveBeenCalled();
    fireEvent.press(screen.getByTestId('gift-card-amount-1000'));
    fireEvent.press(screen.getByTestId('gift-card-for-someone'));
    fireEvent.changeText(screen.getByTestId('gift-card-recipient-email-input'), 'nope');
    expect(
      await screen.findByText(fallbackT('mweb.auth.validation.emailInvalid')),
    ).toBeOnTheScreen();
    fireEvent.changeText(screen.getByTestId('gift-card-recipient-email-input'), ' friend@x.com ');
    fireEvent.press(screen.getByTestId('gift-card-continue'));
    await waitFor(() =>
      expect(onContinue).toHaveBeenCalledWith(
        expect.objectContaining({ amount: 1000, gift: true, recipient_email: 'friend@x.com' }),
      ),
    );
  });
});
