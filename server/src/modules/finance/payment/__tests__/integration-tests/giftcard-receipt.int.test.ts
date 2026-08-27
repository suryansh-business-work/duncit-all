jest.mock('@services/email/email.service', () => ({ sendEmail: jest.fn().mockResolvedValue(undefined) }));
jest.mock('@services/invoice/invoice.pdf', () => ({
  generateInvoicePdf: jest.fn().mockResolvedValue(Buffer.from('pdf')),
}));
// The card itself is not what is under test here — the PURCHASER's receipt is.
// Stubbing the service keeps this suite off the gift-card flag, the amount
// settings and the card's own email, none of which decide the receipt.
jest.mock('@modules/finance/giftcard/giftcard.service', () => ({
  giftcardService: {
    assertPurchaseEnabled: jest.fn().mockResolvedValue(undefined),
    purchaseFacts: jest.fn(),
    issueForPayment: jest.fn().mockResolvedValue({ _id: 'gc-doc-1', code: 'DUN-GC-TESTCODE' }),
    emailForPayment: jest.fn().mockResolvedValue({ to: 'priya@x.com', cardId: 'gc-doc-1' }),
  },
}));

import { paymentService } from '../../payment.service';
import { UserModel } from '@modules/access/user/user.model';
import { giftcardService } from '@modules/finance/giftcard/giftcard.service';
import { receiptForPayment } from '@test/deferred-payment';

let seq = 0;

const seedUser = () =>
  UserModel.create({
    auth: { email: `gc${++seq}@x.com` },
    profile: { first_name: 'Aarav', last_name: 'Sharma' },
  });

/** The frozen snapshot a gift card payment carries in its metadata. */
const facts = (over: Record<string, unknown> = {}) => ({
  scope_type: 'SHOP',
  scope_category_id: null,
  scope_name: 'Pod Shop',
  scope_image_url: '',
  scope_image_front_url: '',
  scope_image_back_url: '',
  amount: 1000,
  recipient_email: '',
  recipient_name: '',
  message: '',
  ...over,
});

const buyInput = (over: Record<string, unknown> = {}) => ({
  scope_type: 'SHOP',
  amount: 1000,
  contact_email: 'buyer@x.com',
  contact_phone_extension: '+91',
  contact_phone_number: '9876543210',
  billing: { line1: '1 A Rd', city: 'Pune', state: 'MH', pincode: '411001' },
  checkout_url: 'https://app/gift-cards/checkout',
  ...over,
});

describe('payment-receipt-gift-card', () => {
  it('names the card’s value and who it is for, and never carries the code', async () => {
    const user = await seedUser();
    (giftcardService.purchaseFacts as jest.Mock).mockResolvedValue(
      facts({ recipient_name: 'Priya Menon', recipient_email: 'priya@x.com' })
    );

    const res = await paymentService.dummyGiftCardCheckout(buyInput(), String(user._id));
    expect(res.target_type).toBe('GIFT_CARD');

    const receipt = await receiptForPayment(res.payment_id);
    // A GIFT_CARD payment takes the gift card receipt — the single
    // `payment-receipt` could name neither the value nor the recipient.
    expect(receipt.template).toBe('payment-receipt-gift-card');
    expect(receipt.vars.card_amount).toBe('₹1000.00');
    expect(receipt.vars.recipient).toBe('Priya Menon');
    expect(receipt.vars.gift_cards_url.endsWith('/gift-cards')).toBe(true);

    // The code is a bearer instrument: it travels once, in the card's own
    // email, to the person the card is for. It must never be in this one.
    expect(JSON.stringify(receipt.vars)).not.toContain('DUN-GC-TESTCODE');
  });

  it('falls back to the recipient’s address, then to the buyer on a self-purchase', async () => {
    const addressOnly = await seedUser();
    (giftcardService.purchaseFacts as jest.Mock).mockResolvedValue(
      facts({ recipient_email: 'priya@x.com' })
    );
    const gifted = await paymentService.dummyGiftCardCheckout(
      buyInput(),
      String(addressOnly._id)
    );
    expect((await receiptForPayment(gifted.payment_id)).vars.recipient).toBe('priya@x.com');

    // Bought for yourself: neither name nor address is set, and the buyer IS
    // the recipient.
    const self = await seedUser();
    (giftcardService.purchaseFacts as jest.Mock).mockResolvedValue(facts());
    const own = await paymentService.dummyGiftCardCheckout(buyInput(), String(self._id));
    expect((await receiptForPayment(own.payment_id)).vars.recipient).toBe('Aarav Sharma');
  });

  it('shows the face value, not the charge, when coins paid part of it', async () => {
    const user = await seedUser();
    (giftcardService.purchaseFacts as jest.Mock).mockResolvedValue(facts({ amount: 1500 }));

    const res = await paymentService.dummyGiftCardCheckout(
      buyInput({ amount: 1500 }),
      String(user._id)
    );

    const receipt = await receiptForPayment(res.payment_id);
    // `card_amount` is what the holder can redeem; `amount` is what was charged.
    expect(receipt.vars.card_amount).toBe('₹1500.00');
    expect(receipt.vars.amount).toBe(`₹${res.total.toFixed(2)}`);
  });
});
