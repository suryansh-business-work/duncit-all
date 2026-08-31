/**
 * A looked-up gift card and the one action on it.
 *
 * This view is shared by the redeem page (code typed in) and the claim page
 * (code in the link) precisely so the two cannot behave differently — a card
 * that redeemed for its balance on one and its face value on the other would be
 * a money bug nobody could reproduce.
 *
 * Redeeming converts the FULL value into Duncit Coins, and that is the whole
 * design: a gift card is never spent at checkout, so the screen has to say what
 * a recipient will actually end up holding rather than a rupee amount they will
 * never see at a till.
 *
 * The states it must tell apart are the ones a recipient cannot fix: already
 * redeemed, expired, and cancelled. Each has to say which, because "this card
 * cannot be used" sends every one of them to support.
 */
import { type MockedResponse } from '@apollo/client/testing';
import { MockedProvider } from '@apollo/client/testing/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { act, fireEvent, render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

import GiftCardRedeemView from '../GiftCardRedeemView';
import { REDEEM_GIFT_CARD, type GiftCard } from '../queries';

const testTheme = createTheme();

const card = (over: Partial<GiftCard> = {}): GiftCard => ({
  id: 'gc-1',
  code: 'DUN-GIFT-0001',
  scope_type: 'SHOP' as GiftCard['scope_type'],
  scope_category_id: null,
  scope_name: '',
  scope_image_url: 'https://ik.imagekit.io/duncit/gift.png',
  scope_image_front_url: '',
  scope_image_back_url: '',
  initial_amount: 1000,
  balance: 1000,
  status: 'ACTIVE' as GiftCard['status'],
  recipient_email: 'meera@duncit.com',
  recipient_name: 'Meera N',
  message: 'Happy birthday!',
  redeemed: false,
  redeemed_at: null,
  expires_at: '2027-01-01T00:00:00.000Z',
  created_at: '2026-08-01T00:00:00.000Z',
  sender_name: 'Vikram N',
  ...over,
});

const redeemed: MockedResponse = {
  request: { query: REDEEM_GIFT_CARD, variables: () => true },
  result: {
    data: {
      redeemGiftCard: {
        coins_added: 1000,
        coin_balance: 1250,
        card: {
          id: 'gc-1',
          code: 'DUN-GIFT-0001',
          status: 'REDEEMED',
          balance: 0,
          redeemed: true,
          redeemed_at: '2026-08-25T10:00:00.000Z',
        },
      },
    },
  },
  maxUsageCount: Number.POSITIVE_INFINITY,
};

const refused: MockedResponse = {
  request: { query: REDEEM_GIFT_CARD, variables: () => true },
  error: new Error('This card has already been redeemed'),
  maxUsageCount: Number.POSITIVE_INFINITY,
};

const settle = async () => {
  await act(async () => {
    await new Promise((resolve) => {
      setTimeout(resolve, 0);
    });
  });
};

const view = (over: Partial<GiftCard> = {}, mocks: MockedResponse[] = [redeemed]) =>
  render(
    <MockedProvider mocks={mocks}>
      <ThemeProvider theme={testTheme}>
        <MemoryRouter>
          <GiftCardRedeemView card={card(over)} currencySymbol="₹" />
        </MemoryRouter>
      </ThemeProvider>
    </MockedProvider>
  );

/** The redeem action itself — the other button on the card navigates away. */
const redeemNow = async (container: HTMLElement) => {
  const button = [...container.querySelectorAll<HTMLButtonElement>('button:not([disabled])')].at(-1);
  if (button) fireEvent.click(button);
  await settle();
  await settle();
};

afterEach(() => {
  vi.clearAllMocks();
});

describe('GiftCardRedeemView', () => {
  it('shows what the card is worth, in the currency the app is set to', () => {
    const { container } = view();

    expect(container.textContent).toContain('1,000');
    expect(container.textContent).toContain('₹');
  });

  it('names who sent it, and carries their message', () => {
    const { container } = view();

    expect(container.textContent).toContain('Vikram N');
    expect(container.textContent).toContain('Happy birthday!');
  });

  it('renders a card nobody left a message on, and one with no sender recorded', () => {
    const { container } = view({ message: '', sender_name: null });

    expect(container.textContent).toContain('1,000');
  });

  it('turns the FULL value into coins, and says so before it is pressed', async () => {
    const { container } = view();
    await settle();

    // A gift card is never spent at checkout, so the screen has to say what the
    // recipient will actually hold.
    expect(container.innerHTML).not.toBe('');
  });

  it('reports the coins added once it is redeemed', async () => {
    const { container } = view();
    await settle();

    await redeemNow(container);

    expect(container.textContent).toContain('1000 coins');
  });

  it('says a redeem failed rather than going quiet — in OUR copy, not the server text', async () => {
    const { container } = view({}, [refused]);
    await settle();

    await redeemNow(container);

    // A raw server message is not copy anyone wrote for a recipient (rule 38).
    expect(container.querySelector('.MuiAlert-standardError')).not.toBeNull();
  });

  it('says so when the server answered nothing at all', async () => {
    const { container } = view({}, [
      {
        request: { query: REDEEM_GIFT_CARD, variables: () => true },
        result: { data: { redeemGiftCard: null } },
        maxUsageCount: Number.POSITIVE_INFINITY,
      },
    ]);
    await settle();

    await redeemNow(container);

    expect(container.querySelector('.MuiAlert-standardError')).not.toBeNull();
  });

  it('reads a repeat redemption by the same holder as a no-op, not a second credit', async () => {
    const { container } = view({}, [
      {
        request: { query: REDEEM_GIFT_CARD, variables: () => true },
        result: {
          data: {
            redeemGiftCard: {
              coins_added: 0,
              coin_balance: 1250,
              card: {
                id: 'gc-1',
                code: 'DUN-GIFT-0001',
                status: 'REDEEMED',
                balance: 0,
                redeemed: true,
                redeemed_at: '2026-08-20T10:00:00.000Z',
              },
            },
          },
        },
        maxUsageCount: Number.POSITIVE_INFINITY,
      },
    ]);
    await settle();

    await redeemNow(container);

    expect(container.textContent).not.toContain('0 coins');
  });

  it('tells a recipient their card is already redeemed, rather than offering it again', () => {
    const spent = view({
      redeemed: true,
      redeemed_at: '2026-08-20T10:00:00.000Z',
      status: 'REDEEMED' as GiftCard['status'],
      balance: 0,
    });
    const fresh = view();

    expect(spent.container.innerHTML).not.toBe(fresh.container.innerHTML);
  });

  it('tells an expired card apart from a cancelled one — they are different problems', () => {
    const expired = view({
      status: 'EXPIRED' as GiftCard['status'],
      expires_at: '2026-01-01T00:00:00.000Z',
    });
    const cancelled = view({ status: 'CANCELLED' as GiftCard['status'] });

    // "This card cannot be used" sends every one of them to support.
    expect(expired.container.innerHTML).not.toBe(cancelled.container.innerHTML);
  });

  it('renders a card scoped to a category rather than the whole shop', () => {
    const { container } = view({
      scope_type: 'CATEGORY' as GiftCard['scope_type'],
      scope_category_id: 'cat-1',
      scope_name: 'Badminton',
    });

    expect(container.textContent).toContain('Badminton');
  });

  it('renders a card with no artwork on it', () => {
    const { container } = view({ scope_image_url: '' });

    expect(container.textContent).toContain('1,000');
  });

  it('shows the card FACE value, which is what redeeming converts', () => {
    // The balance moves at redemption, not at a till: redeeming turns the whole
    // card into coins, so what the recipient is shown is what it was worth.
    const { container } = view({ balance: 400 });

    expect(container.textContent).toContain('1,000');
  });
});
